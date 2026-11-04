import { DataSource, EntitySchema, Between, MoreThanOrEqual } from 'typeorm';
import { Rollback, swallowRollback } from '../shared.mjs';

const User = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String },
    email: { type: String, unique: true },
    score: { type: Number },
  },
  relations: {
    orders: { type: 'one-to-many', target: 'Order', inverseSide: 'user' },
  },
});

const Order = new EntitySchema({
  name: 'Order',
  tableName: 'orders',
  columns: {
    id: { type: Number, primary: true, generated: true },
    amount: { type: Number },
    status: { type: String },
  },
  relations: {
    user: { type: 'many-to-one', target: 'User', joinColumn: { name: 'user_id' }, inverseSide: 'orders' },
  },
});

export async function create({ url, pool }) {
  const ds = new DataSource({
    type: 'postgres',
    url,
    poolSize: pool,
    entities: [User, Order],
    synchronize: false,
  });
  await ds.initialize();

  const users = ds.getRepository(User);
  const orders = ds.getRepository(Order);

  return {
    byId: (id) => users.findOneBy({ id }),
    insert: async (n, e, s) => (await users.insert({ name: n, email: e, score: s })).identifiers[0].id,
    update: (id, s) => users.update({ id }, { score: s }),
    remove: (id) => users.delete({ id }),
    filter: (min, off) =>
      users.find({
        where: { score: MoreThanOrEqual(min) },
        order: { id: 'ASC' },
        skip: off,
        take: 20,
        select: { id: true, name: true, score: true },
      }),
    join: (start) => users.find({ where: { id: Between(start, start + 49) }, relations: { orders: true } }),
    agg: (st) =>
      orders
        .createQueryBuilder('o')
        .select('COUNT(*)', 'c')
        .addSelect('SUM(o.amount)', 's')
        .where('o.status = :st', { st })
        .getRawOne(),
    bulk: (rows) => ds.createQueryBuilder().insert().into(User).values(rows).execute(),
    txRollback: (id) =>
      ds
        .transaction(async (m) => {
          await m.getRepository(User).update({ id }, { score: () => 'score + 1' });
          await m.getRepository(Order).insert({ user: { id }, amount: 1, status: 'open' });
          await m.getRepository(Order).count({ where: { user: { id } } });
          throw new Rollback();
        })
        .catch(swallowRollback),
    close: () => ds.destroy(),
  };
}