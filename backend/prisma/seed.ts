import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  await prisma.currency.upsert({
    where: { code: 'XOF' },
    create: { code: 'XOF', name: 'Franc CFA (UEMOA)', symbol: 'CFA', minorUnit: 0 },
    update: {},
  });
  await prisma.currency.upsert({
    where: { code: 'XAF' },
    create: { code: 'XAF', name: 'Franc CFA (CEMAC)', symbol: 'FCFA', minorUnit: 0 },
    update: {},
  });

  const senegal = await prisma.country.upsert({
    where: { code: 'SN' },
    create: { code: 'SN', name: 'Sénégal', currencyCode: 'XOF', phonePrefix: '+221' },
    update: {},
  });
  const congo = await prisma.country.upsert({
    where: { code: 'CG' },
    create: { code: 'CG', name: 'Congo-Brazzaville', currencyCode: 'XAF', phonePrefix: '+242' },
    update: {},
  });
  const gabon = await prisma.country.upsert({
    where: { code: 'GA' },
    create: { code: 'GA', name: 'Gabon', currencyCode: 'XAF', phonePrefix: '+241' },
    update: {},
  });

  const cities: [string, string][] = [
    [senegal.id, 'Dakar'],
    [senegal.id, 'Thiès'],
    [senegal.id, 'Saint-Louis'],
    [congo.id, 'Brazzaville'],
    [congo.id, 'Pointe-Noire'],
    [gabon.id, 'Libreville'],
    [gabon.id, 'Port-Gentil'],
  ];
  for (const [countryId, name] of cities) {
    await prisma.city.upsert({
      where: { countryId_name: { countryId, name } },
      create: { countryId, name },
      update: {},
    });
  }

  const rootCategories = [
    { name: 'Mode', slug: 'mode' },
    { name: 'Électronique', slug: 'electronique' },
    { name: 'Maison & Jardin', slug: 'maison-jardin' },
    { name: 'Véhicules', slug: 'vehicules' },
    { name: 'Enfants & Bébé', slug: 'enfants-bebe' },
    { name: 'Beauté & Santé', slug: 'beaute-sante' },
  ];
  for (const [index, category] of rootCategories.entries()) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      create: { ...category, sortOrder: index },
      update: {},
    });
  }

  // Default commission rule per country: 8%, no fixed fee, applies unless a more specific
  // rule (category/sellerType) is configured later from the admin dashboard.
  for (const country of [senegal, congo, gabon]) {
    const existing = await prisma.commissionRule.findFirst({
      where: { countryId: country.id, categoryId: null, sellerType: null },
    });
    if (!existing) {
      await prisma.commissionRule.create({
        data: { countryId: country.id, percentageBps: 800, fixedFee: 0 },
      });
    }
  }

  console.log('Seed complete: currencies, countries (SN/CG/GA), cities, categories, default commission rules.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
