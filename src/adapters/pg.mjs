import pg from 'pg';
import { cols } from '../shared.mjs';

export async function create({ url, prepared, pool }) {
  const p = new pg.Pool({ connectionString: url, max: pool });
  // Com prepared ativo, cada consulta recebe um nome fixo, o que ativa prepared statements nomeados.
  const named = (name, text, values) => (prepared ? { name, text, values } : { text, values });
  const q = (name, text, values) => p.query(named(name, text, values));

  return {
    byId: (id) => q('byId', 'select id, name, email, score from users where id = $1', [id]),
    insert: async (n, e, s) =>
      (await q('insert', 'insert into users (name, email, score) values ($1, $2, $3) returning id', [n, e, s])).rows[0].id,
    update: (id, s) => q('update', 'update users set score = $2 where id = $1', [id, s]),
    remove: (id) => q('delete', 'delete from users where id = $1', [id]),
    filter: (min, off) =>
      q('filter', 'select id, name, score from users where score >= $1 order by id limit 20 offset $2', [min, off]),
    join: (start) =>
      q(
        'join',
        'select u.id, u.name, o.amount from users u join orders o on o.user_id = u.id where u.id between $1 and $2',
        [start, start + 49],
      ),
    agg: (st) => q('agg', 'select count(*), sum(amount) from orders where status = $1', [st]),
    bulk: (rows) => {
      const c = cols(rows);
      return q(
        'bulk',
        'insert into users (name, email, score) select * from unnest($1::text[], $2::text[], $3::int[])',
        [c.names, c.emails, c.scores],
      );
    },
    txRollback: async (id) => {
      const c = await p.connect();
      try {
        await c.query('begin');
        await c.query(named('tx_upd', 'update users set score = score + 1 where id = $1', [id]));
        await c.query(named('tx_ins', "insert into orders (user_id, amount, status) values ($1, 1, 'open')", [id]));
        await c.query(named('tx_cnt', 'select count(*) from orders where user_id = $1', [id]));
        await c.query('rollback');
      } finally {
        c.release();
      }
    },
    close: () => p.end(),
  };
}