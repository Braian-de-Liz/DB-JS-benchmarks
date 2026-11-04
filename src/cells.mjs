import { URL, POOL, PREPARED } from './config.mjs';

const base = { url: URL, prepared: PREPARED, pool: POOL };
const load = (name) => () => import(`./adapters/${name}.mjs`).then((m) => m.create(base));
const drizzle = (driver) => () => import('./adapters/drizzle.mjs').then((m) => m.create({ ...base, driver }));

export const CELLS = [
  // Bloco A: drivers puros
  { id: 'pg-node', block: 'A', runtime: 'node', create: load('pg') },
  { id: 'pg-bun', block: 'A', runtime: 'bun', create: load('pg') },
  { id: 'postgresjs-node', block: 'A', runtime: 'node', create: load('postgresjs') },
  { id: 'postgresjs-bun', block: 'A', runtime: 'bun', create: load('postgresjs') },
  { id: 'bunsql-bun', block: 'A', runtime: 'bun', create: load('bunsql') },

  // Bloco B: ORMs e query builders no driver nativo
  { id: 'drizzle-pg-node', block: 'B', runtime: 'node', create: drizzle('pg') },
  { id: 'drizzle-pg-bun', block: 'B', runtime: 'bun', create: drizzle('pg') },
  { id: 'drizzle-postgresjs-node', block: 'B', runtime: 'node', create: drizzle('postgresjs') },
  { id: 'drizzle-postgresjs-bun', block: 'B', runtime: 'bun', create: drizzle('postgresjs') },
  { id: 'drizzle-bunsql-bun', block: 'B', runtime: 'bun', create: drizzle('bunsql') },
  { id: 'prisma-node', block: 'B', runtime: 'node', create: load('prisma') },
  { id: 'prisma-bun', block: 'B', runtime: 'bun', create: load('prisma') },
  { id: 'typeorm-node', block: 'B', runtime: 'node', create: load('typeorm') },
  { id: 'typeorm-bun', block: 'B', runtime: 'bun', create: load('typeorm') },
  { id: 'sequelize-node', block: 'B', runtime: 'node', create: load('sequelize') },
  { id: 'sequelize-bun', block: 'B', runtime: 'bun', create: load('sequelize') },
  { id: 'kysely-node', block: 'B', runtime: 'node', create: load('kysely') },
  { id: 'kysely-bun', block: 'B', runtime: 'bun', create: load('kysely') },
  { id: 'knex-node', block: 'B', runtime: 'node', create: load('knex') },
  { id: 'knex-bun', block: 'B', runtime: 'bun', create: load('knex') },
];