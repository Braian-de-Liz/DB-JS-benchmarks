import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { CELLS } from './cells.mjs';
import { SCENARIO_NAMES } from './scenarios.mjs';

// ONLY=pg-node,pg-bun npm run bench  filtra células específicas.
const only = process.env.ONLY?.split(',');
const selected = CELLS.filter((c) => !only || only.includes(c.id));

// Cada célula roda em processo próprio, para que o heap e as conexões não se misturem.
function runCell(cell) {
  return new Promise((resolve, reject) => {
    const args =
      cell.runtime === 'node'
        ? ['--expose-gc', 'src/worker.mjs', cell.id]
        : ['src/worker.mjs', cell.id];
    const child = spawn(cell.runtime, args, { stdio: ['ignore', 'pipe', 'inherit'] });
    let out = '';
    child.stdout.on('data', (d) => {
      out += d;
    });
    child.on('error', reject);
    child.on('close', (code) => {
      const line = out.split('\n').find((l) => l.startsWith('{'));
      if (code !== 0 || !line) return reject(new Error(`saiu com código ${code}`));
      resolve(JSON.parse(line));
    });
  });
}

function report(results) {
  const lines = [
    '## Conexão e memória',
    '',
    '| Célula | Bloco | Conexão (ms) | Heap retido (MB) | Status |',
    '|---|---|---|---|---|',
  ];
  for (const r of results) {
    lines.push(
      r.error
        ? `| ${r.cell} | ${r.block ?? ''} | - | - | erro: ${r.error} |`
        : `| ${r.cell} | ${r.block} | ${r.connectMs.toFixed(1)} | ${r.heapMB.toFixed(1)} | ok |`,
    );
  }
  for (const s of SCENARIO_NAMES) {
    lines.push('', `## ${s}`, '', '| Célula | Operação | ops/s | p50 (ms) | p95 (ms) | p99 (ms) |', '|---|---|---|---|---|---|');
    for (const r of results) {
      for (const [op, st] of Object.entries(r.results?.[s] ?? {})) {
        lines.push(
          `| ${r.cell} | ${op} | ${st.opsPerSec.toFixed(0)} | ${st.p50.toFixed(2)} | ${st.p95.toFixed(2)} | ${st.p99.toFixed(2)} |`,
        );
      }
    }
  }
  return lines.join('\n');
}

const results = [];
for (const cell of selected) {
  console.log(`> ${cell.id}`);
  try {
    results.push(await runCell(cell));
  } catch (e) {
    results.push({ cell: cell.id, block: cell.block, runtime: cell.runtime, error: e.message });
  }
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
mkdirSync('results', { recursive: true });
writeFileSync(`results/${stamp}.json`, JSON.stringify(results, null, 2));
const md = report(results);
writeFileSync(`results/${stamp}.md`, md);
console.log(md);