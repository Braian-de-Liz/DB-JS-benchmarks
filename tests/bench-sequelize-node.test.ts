import { describe, test, expect, beforeAll, afterAll } from "vitest";
import { createSuite, SCENARIO_NAMES, ITER } from "./helpers/suite.mjs";

const suite = createSuite("sequelize-node");

describe("sequelize-node", () => {
  beforeAll(() => suite.open(), 600_000);
  afterAll(() => suite.close(), 600_000);

  for (const name of SCENARIO_NAMES) {
    test(name, async () => {
      const r = await suite.run(name);
      for (const s of Object.values(r)) {
        expect(s.n).toBe(ITER);
        expect(s.opsPerSec).toBeGreaterThan(0);
      }
    }, 1_800_000);
  }
});