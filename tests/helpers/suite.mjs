import { mkdirSync, writeFileSync } from 'node:fs';
import { CELLS } from '../../src/cells.mjs';
import { runScenario, SCENARIO_NAMES } from '../../src/scenarios.mjs';
import { ITER, WARMUP, CONC } from '../../src/config.mjs';
import { reset } from '../../src/reset.mjs';

export { SCENARIO_NAMES, ITER };

const currentRuntime = () => (typeof Bun !== 'undefined' ? 'bun' : 'node');
const forceGc = () => (globalThis.Bun ? Bun.gc(true) : globalThis.gc?.());

// Uma suíte por célula. Abre a conexão, roda cada cenário e grava results/<célula>.json.
export function createSuite(id) {
  const cell = CELLS.find((c) => c.id === id);
  if (!cell) throw new Error(`célula desconhecida: ${id}`);
  if (currentRuntime() !== cell.runtime) {
    throw new Error(`${id} precisa rodar em ${cell.runtime}, mas está em ${currentRuntime()}`);
  }

  const out = { cell: id, block: cell.block, runtime: cell.runtime, connectMs: null, heapMB: null, results: {} };
  let ops;

  return {
    async open() {
      const t0 = performance.now();
      ops = await cell.create();
      await ops.byId(1);
      out.connectMs = performance.now() - t0;
    },
    async run(name) {
      const r = await runScenario(ops, name, { iterations: ITER, warmup: WARMUP, concurrency: CONC });
      out.results[name] = r;
      await reset();
      forceGc();
      for (const [op, s] of Object.entries(r)) {
        console.log(
          `[${id}] ${name}/${op}: ${s.opsPerSec.toFixed(0)} ops/s, p50 ${s.p50.toFixed(2)} ms, p95 ${s.p95.toFixed(2)} ms, p99 ${s.p99.toFixed(2)} ms`,
        );
      }
      return r;
    },
    async close() {
      forceGc();
      out.heapMB = process.memoryUsage().heapUsed / 1024 / 1024;
      await ops?.close();
      mkdirSync('results', { recursive: true });
      writeFileSync(`results/${id}.json`, JSON.stringify(out, null, 2));
    },
  };
}