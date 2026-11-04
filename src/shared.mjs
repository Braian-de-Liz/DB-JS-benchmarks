export class Rollback extends Error {}

export const swallowRollback = (e) => {
  if (!(e instanceof Rollback)) throw e;
};

export const cols = (rows) => ({
  names: rows.map((r) => r.name),
  emails: rows.map((r) => r.email),
  scores: rows.map((r) => r.score),
});