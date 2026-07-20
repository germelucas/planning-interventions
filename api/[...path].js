import { copyFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/app.js';
import { openDatabase } from '../server/database.js';

const databasePath = path.join(tmpdir(), 'planning-interventions.db');

if (!existsSync(databasePath)) {
  const projectDatabase = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../planning.db');
  copyFileSync(projectDatabase, databasePath);
}

const app = createApp({ database: openDatabase(databasePath) });

export default app;
