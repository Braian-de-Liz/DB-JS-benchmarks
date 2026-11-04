import { CELLS } from './cells.mjs';
import { runScenario, SCENARIO_NAMES } from './scenarios.mjs';
import { ITER, WARMUP, CONC } from './config.mjs';
import { reset } from './reset.mjs';

const cell = CELLS.find((c) => c.id === process.argv[2]);
if (!cell) throw new Error(`célula desconhecida: ${process.argv[2]}`);

const runtime = typeof Bun !== 'undefined' ? 'bun' : 'node';
if (runtime !== cell.runtime) {
  throw new Error(`${cell.id} precisa rodar em ${cell.runtime}, mas está em ${runtime}`);
}

const forceGc = () => (globalThis.Bun ? Bun.gc(true) : globalThis.gc?.());

const t0 = performance.now();
const ops = await cell.create();
await ops.byId(1);
const connectMs = performance.now() - t0;

const results = {};
for (const name of SCENARIO_NAMES) {
  results[name] = await runScenario(ops, name, { iterations: ITER, warmup: WARMUP, concurrency: CONC });
  await reset();
  forceGc();
}

forceGc();
const heapMB = process.memoryUsage().heapUsed / 1024 / 1024;
await ops.close();

console.log(JSON.stringify({ cell: cell.id, block: cell.block, runtime, connectMs, heapMB, results }));