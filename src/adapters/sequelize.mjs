import { Sequelize, DataTypes, Op, fn, col } from 'sequelize';
import { Rollback, swallowRollback } from '../shared.mjs';

export async function create({ url, pool }) {
  const seq = new Sequelize(url, {
    dialect: 'postgres',
    logging: false,
    pool: { max: pool, min: 0, idle: 10_000 },
  });

  const User = seq.define(
    'User',
    {
      name: DataTypes.STRING,
      email: { type: DataTypes.STRING, unique: true },
      score: DataTypes.INTEGER,
    },
    { tableName: 'users', timestamps: false },
  );

  const Order = seq.define(
    'Order',
    {
      amount: DataTypes.INTEGER,
      status: DataTypes.STRING,
    },
    { tableName: 'orders', timestamps: false },
  );

  User.hasMany(Order, { foreignKey: 'user_id' });
  Order.belongsTo(User, { foreignKey: 'user_id' });

  await seq.authenticate();

  // Todos os modos de leitura hidratam instancias de modelo (sem raw: true), que e o uso tipico do ORM.
  // Sequelize com dialect postgres nao expoe prepared statements nomeados; PREPARED nao tem efeito aqui.

  return {
    byId: (id) => User.findByPk(id, { attributes: ['id', 'name', 'email', 'score'] }),
    insert: async (n, e, s) => (await User.create({ name: n, email: e, score: s })).id,
    update: (id, s) => User.update({ score: s }, { where: { id } }),
    remove: (id) => User.destroy({ where: { id } }),
    filter: (min, off) =>
      User.findAll({
        where: { score: { [Op.gte]: min } },
        order: [['id', 'ASC']],
        limit: 20,
        offset: off,
        attributes: ['id', 'name', 'score'],
      }),
    join: (start) =>
      User.findAll({
        where: { id: { [Op.between]: [start, start + 49] } },
        include: [{ model: Order, attributes: ['amount'] }],
      }),
    agg: (st) =>
      Order.findOne({
        where: { status: st },
        attributes: [
          [fn('COUNT', col('id')), 'c'],
          [fn('SUM', col('amount')), 's'],
        ],
      }),
    bulk: (rows) => User.bulkCreate(rows),
    txRollback: (id) =>
      seq
        .transaction(async (t) => {
          await User.update({ score: seq.literal('score + 1') }, { where: { id }, transaction: t });
          await Order.create({ user_id: id, amount: 1, status: 'open' }, { transaction: t });
          await Order.count({ where: { user_id: id }, transaction: t });
          throw new Rollback();
        })
        .catch(swallowRollback),
    close: () => seq.close(),
  };
}