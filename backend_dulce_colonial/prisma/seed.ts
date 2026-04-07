import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Ejecutando seed de Dulce Colonial...');

  const adminPassword = await bcrypt.hash('Admin1234!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@dulcecolonial.com' },
    update: {},
    create: {
      name:         'Administrador',
      email:        'admin@dulcecolonial.com',
      passwordHash: adminPassword,
      role:         'ADMIN',       // ← string directo, sin enum
    },
  });

  const opPassword = await bcrypt.hash('Operador123!', 12);
  await prisma.user.upsert({
    where: { email: 'operador@dulcecolonial.com' },
    update: {},
    create: {
      name:         'Empleada Principal',
      email:        'operador@dulcecolonial.com',
      passwordHash: opPassword,
      role:         'OPERADOR',    // ← string directo
    },
  });

  const products = [
    { name: 'Torta de Chocolate', category: 'Tortas',    price: 45000, stock: 5  },
    { name: 'Cupcake Vainilla',   category: 'Cupcakes',  price: 4500,  stock: 24 },
    { name: 'Galleta Decorada',   category: 'Galletas',  price: 3000,  stock: 50 },
    { name: 'Brownie Nuez',       category: 'Brownies',  price: 5000,  stock: 0  },
  ];

  for (const p of products) {
    await prisma.product.create({ data: p });
  }

  const ingredients = [
    { name: 'Harina de trigo', unit: 'kg',     quantity: 10,  minStock: 3  },
    { name: 'Azúcar blanca',   unit: 'kg',     quantity: 8,   minStock: 3  },
    { name: 'Mantequilla',     unit: 'kg',     quantity: 2,   minStock: 1  },
    { name: 'Huevos',          unit: 'unidad', quantity: 60,  minStock: 12 },
    { name: 'Cacao en polvo',  unit: 'kg',     quantity: 0.5, minStock: 1  },
    { name: 'Leche entera',    unit: 'lt',     quantity: 5,   minStock: 2  },
  ];

  for (const i of ingredients) {
    await prisma.ingredient.create({ data: i });
  }

  console.log('✅ Seed completado.');
  console.log('');
  console.log('👤 Usuarios creados:');
  console.log('   Admin    → admin@dulcecolonial.com     / Admin1234!');
  console.log('   Operador → operador@dulcecolonial.com  / Operador123!');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });