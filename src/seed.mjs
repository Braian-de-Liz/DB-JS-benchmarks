import pg from 'pg';
import { URL, ROWS } from './config.mjs';

const client = new pg.Client({ connectionString: URL });
await client.connect();

await client.query(`
  drop table if exists orders;
  drop table if exists users;
  create table users (
    id serial primary key,
    name text not null,
    email text not null unique,
    score int not null
  );
  create table orders (
    id serial primary key,
    user_id int not null references users(id),
    amount int not null,
    status text not null
  );
  create index on users(score);
  create index on orders(user_id);
  create index on orders(status);
`);

await client.query(
  `insert into users (name, email, score)
   select 'user' || g, 'user' || g || '@bench.test', (random() * 1000)::int
   from generate_series(1, $1) g`,
  [ROWS],
);

await client.query(
  `insert into orders (user_id, amount, status)
   select g, (random() * 500)::int, case when random() < 0.5 then 'paid' else 'open' end
   from generate_series(1, $1) g`,
  [ROWS],
);

await client.query('analyze');
await client.end();
console.log(`Seed concluído: ${ROWS} usuários e ${ROWS} pedidos.`);