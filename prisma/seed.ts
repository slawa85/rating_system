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

  const businesses = await Promise.all([
    prisma.business.create({
      data: { name: 'Coffee Corner', description: 'Artisan coffee shop downtown' },
    }),
    prisma.business.create({
      data: { name: 'Tech Repair Hub', description: 'Fast and reliable electronics repair' },
    }),
    prisma.business.create({
      data: { name: 'Green Grocers', description: 'Organic produce and local goods' },
    }),
  ]);

  const reviews = [
    { customerId: customers[0].id, businessId: businesses[0].id, rating: 5, title: 'Best coffee in town', body: 'Amazing espresso and friendly staff. Will come back!' },
    { customerId: customers[1].id, businessId: businesses[0].id, rating: 4, title: 'Great atmosphere', body: 'Good coffee, cozy place. A bit pricey though.' },
    { customerId: customers[2].id, businessId: businesses[0].id, rating: 4, title: null, body: 'Solid coffee, nothing exceptional but consistent quality.' },
    { customerId: customers[0].id, businessId: businesses[1].id, rating: 3, title: 'Decent repair', body: 'Fixed my laptop screen but took longer than quoted.' },
    { customerId: customers[1].id, businessId: businesses[1].id, rating: 5, title: 'Excellent service', body: 'Fixed my phone in under an hour. Very professional.' },
    { customerId: customers[0].id, businessId: businesses[2].id, rating: 5, title: 'Fresh produce', body: 'Love the organic selection. Everything is always fresh.' },
    { customerId: customers[2].id, businessId: businesses[2].id, rating: 4, title: null, body: 'Good variety of local products. Prices are fair.' },
  ];

  for (const review of reviews) {
    await prisma.review.create({ data: review });
  }

  // Recalculate averages for each business
  for (const business of businesses) {
    const stats = await prisma.review.aggregate({
      where: { businessId: business.id },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await prisma.business.update({
      where: { id: business.id },
      data: {
        averageRating: stats._avg.rating ?? 0,
        reviewCount: stats._count.rating,
      },
    });
  }

  console.log(`Seeded ${customers.length} customers, ${businesses.length} businesses, ${reviews.length} reviews`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
