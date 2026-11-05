import { Kysely, PostgresDialect, sql } from 'kysely';
import pg from 'pg';
import { Rollback, swallowRollback } from '../shared.mjs';

// Kysely compila a query e chama pool.query(text, values) do pg, sem nome de statement.
// Nao ha opcao para prepared statements nomeados; PREPARED nao tem efeito aqui.
export async function create({ url, pool }) {
  const db = new Kysely({
    dialect: new PostgresDialect({
      pool: new pg.Pool({ connectionString: url, max: pool }),
    }),
  });

  return {
    byId: (id) =>
      db.selectFrom('users').select(['id', 'name', 'email', 'score']).where('id', '=', id).executeTakeFirst(),
    insert: async (name, email, score) =>
      (await db.insertInto('users').values({ name, email, score }).returning('id').executeTakeFirstOrThrow()).id,
    update: (id, score) => db.updateTable('users').set({ score }).where('id', '=', id).execute(),
    remove: (id) => db.deleteFrom('users').where('id', '=', id).execute(),
    filter: (min, off) =>
      db
        .selectFrom('users')
        .select(['id', 'name', 'score'])
        .where('score', '>=', min)
        .orderBy('id')
        .limit(20)
        .offset(off)
        .execute(),
    join: (start) =>
      db
        .selectFrom('users as u')
        .innerJoin('orders as o', 'o.user_id', 'u.id')
        .select(['u.id', 'u.name', 'o.amount'])
        .where('u.id', '>=', start)
        .where('u.id', '<=', start + 49)
        .execute(),
    agg: (st) =>
      db
        .selectFrom('orders')
        .select([sql`count(*)`.as('c'), sql`sum(amount)`.as('s')])
        .where('status', '=', st)
        .executeTakeFirst(),
    bulk: (rows) => db.insertInto('users').values(rows).execute(),
    txRollback: (id) =>
      db
        .transaction()
        .execute(async (trx) => {
          await trx.updateTable('users').set({ score: sql`score + 1` }).where('id', '=', id).execute();
          await trx.insertInto('orders').values({ user_id: id, amount: 1, status: 'open' }).execute();
          await trx.selectFrom('orders').select(sql`count(*)`.as('c')).where('user_id', '=', id).execute();
          throw new Rollback();
        })
        .catch(swallowRollback),
    close: () => db.destroy(),
  };
}