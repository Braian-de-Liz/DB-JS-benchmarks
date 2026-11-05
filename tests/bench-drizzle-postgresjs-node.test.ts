import { describe, test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createSuite, SCENARIO_NAMES, ITER } from "./helpers/suite.mjs";

const suite = createSuite("drizzle-postgresjs-node");

describe("drizzle-postgresjs-node", () => {
  before(() => suite.open(), { timeout: 600_000 });
  after(() => suite.close(), { timeout: 600_000 });

  for (const name of SCENARIO_NAMES) {
    test(name, { timeout: 1_800_000 }, async () => {
      const r = await suite.run(name);
      for (const s of Object.values(r)) {
        assert.equal(s.n, ITER);
        assert.ok(s.opsPerSec > 0);
      }
    });
  }
});