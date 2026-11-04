import { SQL } from 'bun';
import { cols, Rollback, swallowRollback } from '../shared.mjs';

export async function create({ url, prepared, pool }) {
  const sql = new SQL({ url, max: pool, prepare: prepared });

  return {
    byId: (id) => sql`select id, name, email, score from users where id = ${id}`,
    insert: async (n, e, s) =>
      (await sql`insert into users (name, email, score) values (${n}, ${e}, ${s}) returning id`)[0].id,
    update: (id, s) => sql`update users set score = ${s} where id = ${id}`,
    remove: (id) => sql`delete from users where id = ${id}`,
    filter: (min, off) =>
      sql`select id, name, score from users where score >= ${min} order by id limit 20 offset ${off}`,
    join: (start) =>
      sql`select u.id, u.name, o.amount from users u join orders o on o.user_id = u.id where u.id between ${start} and ${start + 49}`,
    agg: (st) => sql`select count(*), sum(amount) from orders where status = ${st}`,
    bulk: (rows) => {
      const c = cols(rows);
      return sql`insert into users (name, email, score)
        select * from unnest(${sql.array(c.names, 'TEXT')}::text[], ${sql.array(c.emails, 'TEXT')}::text[], ${sql.array(c.scores, 'INT4')}::int[])`;
    },
    txRollback: (id) =>
      sql
        .begin(async (t) => {
          await t`update users set score = score + 1 where id = ${id}`;
          await t`insert into orders (user_id, amount, status) values (${id}, 1, 'open')`;
          await t`select count(*) from orders where user_id = ${id}`;
          throw new Rollback();
        })
        .catch(swallowRollback),
    close: () => sql.close(),
  };
}