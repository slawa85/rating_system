import { PrismaClient } from '../generated/prisma/client/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

if (process.env.NODE_ENV === 'production') {
  throw new Error('Seed script must not run in production');
}

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://cloudtalk:cloudtalk@localhost:5432/cloudtalk?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool as any);
const prisma = new PrismaClient({ adapter });

/** Matches `register` password rules; shared by all seeded customers. */
const DEFAULT_PASSWORD = 'Password1';

/** Use this account in the frontend (login page) after `npm run seed`. */
const TEST_USER_EMAIL = 'test@example.com';

async function main() {
  console.log('Seeding database...');
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

  const customers = await Promise.all([
    prisma.customer.upsert({
      where: { email: 'alice@example.com' },
      update: { passwordHash },
      create: {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        passwordHash,
      },
    }),
    prisma.customer.upsert({
      where: { email: 'bob@example.com' },
      update: { passwordHash },
      create: { name: 'Bob Smith', email: 'bob@example.com', passwordHash },
    }),
    prisma.customer.upsert({
      where: { email: 'carol@example.com' },
      update: { passwordHash },
      create: {
        name: 'Carol Williams',
        email: 'carol@example.com',
        passwordHash,
      },
    }),
    prisma.customer.upsert({
      where: { email: TEST_USER_EMAIL },
      update: { passwordHash },
      create: {
        name: 'Test User',
        email: TEST_USER_EMAIL,
        passwordHash,
      },
    }),
  ]);

  const productSeeds = [
    {
      sku: 'HDPH-001',
      name: 'Wireless Headphones',
      description: 'Noise-cancelling over-ear headphones',
      imageUrl: 'https://example.com/images/headphones.jpg',
    },
    {
      sku: 'KBRD-002',
      name: 'Mechanical Keyboard',
      description: 'RGB backlit mechanical keyboard with Cherry MX switches',
      imageUrl: 'https://example.com/images/keyboard.jpg',
    },
    {
      sku: 'HUB-003',
      name: 'USB-C Hub',
      description: '7-in-1 USB-C hub with HDMI, USB-A, and SD card reader',
      imageUrl: 'https://example.com/images/hub.jpg',
    },
    {
      sku: 'MOUS-004',
      name: 'Wireless Mouse',
      description:
        'Ergonomic wireless mouse with precision sensor and long battery life',
      imageUrl: 'https://example.com/images/mouse.jpg',
    },
    {
      sku: 'MON-005',
      name: '27" 4K Monitor',
      description: 'IPS panel, 99% sRGB, USB-C with 65W power delivery',
      imageUrl: 'https://example.com/images/monitor.jpg',
    },
    {
      sku: 'WEBC-006',
      name: 'HD Webcam',
      description: '1080p autofocus webcam with dual microphones',
      imageUrl: 'https://example.com/images/webcam.jpg',
    },
    {
      sku: 'SPKR-007',
      name: 'Portable Bluetooth Speaker',
      description: 'Water-resistant speaker with 12-hour playback',
      imageUrl: 'https://example.com/images/speaker.jpg',
    },
    {
      sku: 'SSD-008',
      name: 'NVMe SSD 1TB',
      description: 'PCIe Gen4 read speeds up to 7000 MB/s',
      imageUrl: 'https://example.com/images/ssd.jpg',
    },
    {
      sku: 'DOCK-009',
      name: 'Laptop Docking Station',
      description:
        'Dual 4K display, Ethernet, and multiple USB ports over Thunderbolt',
      imageUrl: 'https://example.com/images/dock.jpg',
    },
    {
      sku: 'CASE-010',
      name: 'Protective Phone Case',
      description: 'Shock-absorbing bumper with MagSafe compatibility',
      imageUrl: 'https://example.com/images/case.jpg',
    },
  ] as const;

  const products = await Promise.all(
    productSeeds.map((p) =>
      prisma.product.upsert({
        where: { sku: p.sku },
        update: {},
        create: {
          sku: p.sku,
          name: p.name,
          description: p.description,
          imageUrl: p.imageUrl,
        },
      }),
    ),
  );

  const reviewTemplates: Array<{
    rating: number;
    title: string | null;
    body: string;
  }> = [
    {
      rating: 5,
      title: 'Exceeded expectations',
      body: 'Build quality and performance are outstanding. Would buy again.',
    },
    {
      rating: 4,
      title: 'Very good overall',
      body: 'Solid product with minor quirks. Good value for the money.',
    },
    {
      rating: 4,
      title: null,
      body: 'Does what it says on the tin. Happy with the purchase.',
    },
  ];

  const reviewData: Array<{
    customerId: string;
    productId: string;
    rating: number;
    title: string | null;
    body: string;
  }> = [];

  for (const product of products) {
    for (let c = 0; c < 3; c++) {
      const t = reviewTemplates[c];
      reviewData.push({
        customerId: customers[c].id,
        productId: product.id,
        rating: t.rating,
        title: t.title,
        body: `${t.body} (${product.name})`,
      });
    }
  }

  for (const review of reviewData) {
    await prisma.review.upsert({
      where: {
        customerId_productId: {
          customerId: review.customerId,
          productId: review.productId,
        },
      },
      update: {},
      create: review,
    });
  }

  for (const product of products) {
    const stats = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.product.update({
      where: { id: product.id },
      data: {
        averageRating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    });
  }

  console.log(
    `Seeded ${customers.length} customers, ${products.length} products, ${reviewData.length} reviews`,
  );
  console.log(
    `Frontend test login — email: ${TEST_USER_EMAIL}  password: ${DEFAULT_PASSWORD}`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
