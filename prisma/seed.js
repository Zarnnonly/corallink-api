// Seeder: bikin akun admin default + investor testing
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  const investorPassword = await bcrypt.hash('investor123', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@corallink.com' },
    update: {},
    create: {
      nama: 'Admin CoralLink',
      email: 'admin@corallink.com',
      password: adminPassword,
      role: 'admin',
    },
  });

  const investor = await prisma.user.upsert({
    where: { email: 'investor@corallink.com' },
    update: {},
    create: {
      nama: 'Investor Testing',
      email: 'investor@corallink.com',
      password: investorPassword,
      role: 'investor',
    },
  });

  console.log('Seeding selesai:');
  console.log('Admin   -> email: admin@corallink.com    | password: admin123');
  console.log('Investor-> email: investor@corallink.com | password: investor123');
  console.log({ admin: admin.id, investor: investor.id });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
