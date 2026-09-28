import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: env('DATABASE_URL'),
  },
  // Prisma es SOLO cliente aquí: las tablas de datos (buscador, tarifas ATM)
  // las gestiona InsForge con sus migraciones. `tables.external` impide que
  // Prisma Migrate / db push las borre o modifique.
  experimental: {
    externalTables: true,
  },
  tables: {
    external: [
      'public.transit_lines',
      'public.transit_stops',
      'public.transit_line_stops',
      'public.transit_trips',
      'public.atm_zones',
      'public.atm_fares',
      'public.payment_systems',
    ],
  },
})
