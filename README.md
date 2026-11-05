# DB-JS-benchmarks

Benchmarks de drivers e ORMs PostgreSQL em Node e Bun. Cada celula (driver ou ORM + runtime) esta em `src/cells.mjs` e tem `tests/bench-<id>.test.ts`, que grava `results/<id>.json`.

## Requisitos

- PostgreSQL acessivel por `DATABASE_URL` (padrao `postgres://bench:bench@localhost:5432/bench`).
- Node >= 22.6. Os testes `.ts` e o client do Prisma (TypeScript gerado) sao carregados com `--experimental-strip-types`, que os scripts `bench:*-node` ja passam. Em Node >= 22.18 a flag nao e mais necessaria.
- Bun para as celulas `*-bun`.
- Antes de rodar as celulas do Prisma: `npm run prisma:generate`. O gerador emite `.ts` com imports `.ts` em `src/generated/prisma`.

## Execucao

- `npm run seed`, depois `npm run bench:<id>` (por exemplo `bench:pg-node`).
- `npm run bench:node:all` e `npm run bench:bun:all` (o Bun usa `bun.test` como filtro de texto no caminho).

## Prepared statements (`PREPARED`, padrao `true`)

| Celula | Efeito de `PREPARED` |
| --- | --- |
| pg, postgres.js, Bun.SQL | aplicado (nome de statement ou opcao `prepare`) |
| drizzle com postgres.js e bun-sql | aplicado (opcao `prepare`) |
| drizzle com pg | aplicado (`.prepare(nome)` em cada query) |
| kysely, knex, typeorm, sequelize, prisma | sem efeito: usam o padrao do `pg` (sem statements nomeados) e as bibliotecas nao expoem essa opcao |

Por isso, essas celulas sao comparaveis a `PREPARED=false` dos drivers puros, independente do valor da variavel.

## Metricas

`opsPerSec` e o numero de iteracoes dividido pelo tempo total do cenario. No cenario `crud`, cada iteracao executa insert, update, byId e delete uma vez, entao as quatro operacoes tem o mesmo `opsPerSec`. A diferenca entre elas esta nas latencias (`mean`, `p50`, `p95`, `p99`).

## Sequelize

Todas as leituras hidratam instancias de modelo (sem `raw: true`).