import pg from 'pg';
import { URL, ROWS } from './config.mjs';

// Remove as linhas criadas durante os cenários, para que cada cenário parta do mesmo volume.
export async function reset() {
  const client = new pg.Client({ connectionString: URL });
  await client.connect();
  try {
    await client.query('delete from users where id > $1', [ROWS]);
  } finally {
    await client.end();
  }
}