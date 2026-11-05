import { ROWS } from './config.mjs';

const rnd = (n) => 1 + Math.floor(Math.random() * n);
let seq = 0;
const email = () => `bench-${Date.now()}-${seq++}@bench.test`;
const rows = (n) => Array.from({ length: n }, () => ({ name: `bulk-${seq++}`, email: email(), score: rnd(1000) }));

// Cada cenário recebe as operações (ops) e `rec`, que cronometra um thunk e guarda a latência.
const SCENARIOS = {
  crud: async (ops, rec) => {
    const id = await rec('insert', () => ops.insert(`crud-${seq}`, email(), rnd(1000)));
    await rec('update', () => ops.update(id, rnd(1000)));
    await rec('byId', () => ops.byId(rnd(ROWS)));
    await rec('delete', () => ops.remove(id));
  },
  filter: (ops, rec) => rec('filter', () => ops.filter(rnd(1000), rnd(1000))),
  join: (ops, rec) => rec('join', () => ops.join(rnd(ROWS - 49))),
  agg: (ops, rec) => rec('agg', () => ops.agg('paid')),
  bulk: (ops, rec) => rec('bulk100', () => ops.bulk(rows(100))),
  tx: (ops, rec) => rec('txRollback', () => ops.txRollback(rnd(ROWS))),
};

export const SCENARIO_NAMES = Object.keys(SCENARIOS);

const stats = (arr, wallS) => {
  arr.sort((a, b) => a - b);
  const pct = (p) => arr[Math.min(arr.length - 1, Math.ceil(p * arr.length) - 1)];
  return {
    n: arr.length,
    // Iteracoes dessa operacao divididas pelo tempo total do cenario. No crud cada iteracao executa
    // insert, update, byId e delete uma vez, entao as quatro operacoes tem o mesmo opsPerSec.
    // Para a latencia de cada operacao, use mean/p50/p95/p99.
    opsPerSec: arr.length / wallS,
    mean: arr.reduce((a, b) => a + b, 0) / arr.length,
    p50: pct(0.5),
    p95: pct(0.95),
    p99: pct(0.99),
  };
};

export async function runScenario(ops, name, { iterations, warmup, concurrency }) {
  const body = SCENARIOS[name];
  const lat = new Map();
  let recording = false;

  const rec = async (label, thunk) => {
    const t0 = performance.now();
    const result = await thunk();
    if (recording) {
      if (!lat.has(label)) lat.set(label, []);
      lat.get(label).push(performance.now() - t0);
    }
    return result;
  };

  const drive = async (total) => {
    let next = 0;
    await Promise.all(
      Array.from({ length: concurrency }, async () => {
        while (next < total) {
          next++;
          await body(ops, rec);
        }
      }),
    );
  };

  await drive(warmup);
  recording = true;
  const t0 = performance.now();
  await drive(iterations);
  const wallS = (performance.now() - t0) / 1000;

  const out = {};
  for (const [label, arr] of lat) out[label] = stats(arr, wallS);
  return out;
}