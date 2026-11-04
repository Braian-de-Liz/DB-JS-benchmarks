import { eq, gte, between, asc, count, sum, sql as sqlTag } from 'drizzle-orm';
import { users, orders } from '../schema/drizzle.mjs';
import { Rollback, swallowRollback } from '../shared.mjs';

// driver: 'pg' | 'postgresjs' | 'bunsql'
export async function create({ driver, url, prepared, pool }) {
  let db;
  let close;

  if (driver === 'pg') {
    const { Pool } = await import('pg');
    const p = new Pool({ connectionString: url, max: pool });
    db = (await import('drizzle-orm/node-postgres')).drizzle(p);
    close = () => p.end();
  } else if (driver === 'postgresjs') {
    const { default: postgres } = await import('postgres');
    const c = postgres(url, { max: pool, prepare: prepared });
    db = (await import('drizzle-orm/postgres-js')).drizzle(c);
    close = () => c.end();
  } else {
    const { SQL } = await import('bun');
    const c = new SQL({ url, max: pool, prepare: prepared });
    db = (await import('drizzle-orm/bun-sql')).drizzle(c);
    close = () => c.close();
  }

  return {
    byId: (id) => db.select().from(users).where(eq(users.id, id)),
    insert: async (n, e, s) =>
      (await db.insert(users).values({ name: n, email: e, score: s }).returning({ id: users.id }))[0].id,
    update: (id, s) => db.update(users).set({ score: s }).where(eq(users.id, id)),
    remove: (id) => db.delete(users).where(eq(users.id, id)),
    filter: (min, off) =>
      db
        .select({ id: users.id, name: users.name, score: users.score })
        .from(users)
        .where(gte(users.score, min))
        .orderBy(asc(users.id))
        .limit(20)
        .offset(off),
    join: (start) =>
      db
        .select({ id: users.id, name: users.name, amount: orders.amount })
        .from(users)
        .innerJoin(orders, eq(orders.userId, users.id))
        .where(between(users.id, start, start + 49)),
    agg: (st) => db.select({ c: count(), s: sum(orders.amount) }).from(orders).where(eq(orders.status, st)),
    bulk: (rows) => db.insert(users).values(rows),
    txRollback: (id) =>
      db
        .transaction(async (tx) => {
          await tx.update(users).set({ score: sqlTag`${users.score} + 1` }).where(eq(users.id, id));
          await tx.insert(orders).values({ userId: id, amount: 1, status: 'open' });
          await tx.select({ c: count() }).from(orders).where(eq(orders.userId, id));
          throw new Rollback();
        })
        .catch(swallowRollback),
    close,
  };
}