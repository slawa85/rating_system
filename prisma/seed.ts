import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const customers = await Promise.all([
    prisma.customer.create({
      data: { name: 'Alice Johnson', email: 'alice@example.com' },
    }),
    prisma.customer.create({
      data: { name: 'Bob Smith', email: 'bob@example.com' },
    }),
    prisma.customer.create({
      data: { name: 'Carol Williams', email: 'carol@example.com' },
    }),
  ]);

  const products = await Promise.all([
    prisma.product.create({
      data: { name: 'Wireless Headphones', description: 'Noise-cancelling over-ear headphones' },
    }),
    prisma.product.create({
      data: { name: 'Mechanical Keyboard', description: 'RGB backlit mechanical keyboard with Cherry MX switches' },
    }),
    prisma.product.create({
      data: { name: 'USB-C Hub', description: '7-in-1 USB-C hub with HDMI, USB-A, and SD card reader' },
    }),
  ]);

  const reviews = [
    { customerId: customers[0].id, productId: products[0].id, rating: 5, title: 'Best headphones ever', body: 'Amazing sound quality and the noise cancellation is superb!' },
    { customerId: customers[1].id, productId: products[0].id, rating: 4, title: 'Great but pricey', body: 'Excellent sound quality. A bit expensive but worth it.' },
    { customerId: customers[2].id, productId: products[0].id, rating: 4, title: null, body: 'Solid headphones, comfortable for long use.' },
    { customerId: customers[0].id, productId: products[1].id, rating: 3, title: 'Decent keyboard', body: 'Good build quality but the switches are a bit loud.' },
    { customerId: customers[1].id, productId: products[1].id, rating: 5, title: 'Excellent keyboard', body: 'Perfect for typing and gaming. Love the feel of Cherry MX.' },
    { customerId: customers[0].id, productId: products[2].id, rating: 5, title: 'Works perfectly', body: 'All ports work flawlessly. Compact and portable.' },
    { customerId: customers[2].id, productId: products[2].id, rating: 4, title: null, body: 'Good hub with reliable connections. Fair price.' },
  ];

  for (const review of reviews) {
    await prisma.review.create({ data: review });
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

  console.log(`Seeded ${customers.length} customers, ${products.length} products, ${reviews.length} reviews`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
