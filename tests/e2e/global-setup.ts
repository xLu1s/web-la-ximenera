import { ensureUsers, pool, resetData } from '../helpers/db';

export default async function globalSetup() {
  await resetData();
  await ensureUsers();
  await pool.end();
}
