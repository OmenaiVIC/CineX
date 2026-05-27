let _impl = null;

export async function initDb() {
  if (_impl) return;
  const dbUrl = process.env.DATABASE_URL;
  if (dbUrl) {
    const mod = await import('./database.pg.js');
    _impl = mod;
  } else {
    const mod = await import('./database.sqlite.js');
    _impl = mod;
  }
  return _impl.initDb();
}

export async function getDb() {
  if (!_impl) throw new Error('Database not initialized. Call initDb() first.');
  return _impl.getDb();
}

export async function closeDb() {
  if (_impl) return _impl.closeDb();
}
