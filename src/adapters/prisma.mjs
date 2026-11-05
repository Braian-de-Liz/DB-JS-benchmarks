import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
// O client gerado e TypeScript (ver prisma/schema.prisma). No Node precisa de --experimental-strip-types (>= 22.6).
import { PrismaClient } from '../generated/prisma/client.ts';
import { Rollback, swallowRollback } from '../shared.mjs';

export async function create({ url, pool }) {
  // @prisma/adapter-pg usa o padrao do driver pg (sem prepared statements nomeados); PREPARED nao tem efeito aqui.
  const adapter = new PrismaPg(new pg.Pool({ connectionString: url, max: pool }));
  const prisma = new PrismaClient({ adapter });

  return {
    byId: (id) => prisma.user.findUnique({ where: { id }, select: { id: true, name: true, email: true, score: true } }),
    insert: async (name, email, score) =>
      (await prisma.user.create({ data: { name, email, score }, select: { id: true } })).id,
    update: (id, score) => prisma.user.update({ where: { id }, data: { score } }),
    remove: (id) => prisma.user.delete({ where: { id } }),
    filter: (min, off) =>
      prisma.user.findMany({
        where: { score: { gte: min } },
        orderBy: { id: 'asc' },
        skip: off,
        take: 20,
        select: { id: true, name: true, score: true },
      }),
    join: (start) =>
      prisma.user.findMany({
        where: { id: { gte: start, lte: start + 49 } },
        select: { id: true, name: true, orders: { select: { amount: true } } },
      }),
    agg: (st) => prisma.order.aggregate({ where: { status: st }, _count: { _all: true }, _sum: { amount: true } }),
    bulk: (rows) => prisma.user.createMany({ data: rows }),
    txRollback: (id) =>
      prisma
        .$transaction(async (tx) => {
          await tx.user.update({ where: { id }, data: { score: { increment: 1 } } });
          await tx.order.create({ data: { userId: id, amount: 1, status: 'open' } });
          await tx.order.count({ where: { userId: id } });
          throw new Rollback();
        })
        .catch(swallowRollback),
    close: () => prisma.$disconnect(),
  };
}