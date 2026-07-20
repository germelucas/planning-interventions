import pg from 'pg';

pg.types.setTypeParser(1114, value => value.slice(0, 16));
// Conserve le contrat historique de l'API : les identifiants sont des nombres,
// même si PostgreSQL stocke les clés en bigint.
pg.types.setTypeParser(20, value => Number(value));

export function openDatabase(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) throw new Error('DATABASE_URL est manquante dans le fichier .env.');
  const pool = new pg.Pool({
    connectionString,
    ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false },
    max: Number(process.env.DB_POOL_SIZE ?? 5),
  });
  return { query: (text, values) => pool.query(text, values), close: () => pool.end() };
}
