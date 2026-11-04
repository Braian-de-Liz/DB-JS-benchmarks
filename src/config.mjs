export const URL = process.env.DATABASE_URL ?? 'postgres://bench:bench@localhost:5432/bench';
export const ROWS = 100_000;
export const ITER = 10_000;
export const WARMUP = 500;
export const CONC = 10;
export const POOL = 50;
export const PREPARED = (process.env.PREPARED ?? 'true') === 'true';