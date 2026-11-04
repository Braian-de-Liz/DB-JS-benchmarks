import knex from 'knex';
import { Rollback, swallowRollback } from '../shared.mjs';

export async function create({ url, pool }) {
  const k = knex({
    client: 'pg',
    connection: url,
    pool: { min: 0, max: pool },
  });

  return {
    byId: (id) => k('users').select('id', 'name', 'email', 'score').where({ id }).first(),
    insert: async (name, email, score) => {
      const r = await k('users').insert({ name, email, score }).returning('id');
      return r[0]?.id ?? r[0];
    },
    update: (id, score) => k('users').where({ id }).update({ score }),
    remove: (id) => k('users').where({ id }).del(),
    filter: (min, off) =>
      k('users').select('id', 'name', 'score').where('score', '>=', min).orderBy('id').limit(20).offset(off),
    join: (start) =>
      k('users as u')
        .join('orders as o', 'o.user_id', 'u.id')
        .select('u.id', 'u.name', 'o.amount')
        .whereBetween('u.id', [start, start + 49]),
    agg: (st) => k('orders').count('* as c').sum('amount as s').where({ status: st }).first(),
    bulk: (rows) => k('users').insert(rows),
    txRollback: (id) =>
      k
        .transaction(async (trx) => {
          await trx('users').where({ id }).update({ score: k.raw('score + 1') });
          await trx('orders').insert({ user_id: id, amount: 1, status: 'open' });
          await trx('orders').count('* as c').where({ user_id: id }).first();
          throw new Rollback();
        })
        .catch(swallowRollback),
    close: () => k.destroy(),
  };
}