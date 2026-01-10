import { describe, expect, it } from 'vitest';
import { migrationSQL } from '../src/lib/migrationSQL';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function normalizeSql(s: string): string {
  return (
    s
      .replace(/\r\n/g, '\n')
      // strip leading/trailing whitespace-only lines
      .replace(/^\s*\n+/, '')
      .replace(/\n+\s*$/, '\n')
  );
}

describe('migrationSQL file sync', () => {
  it('db/migration.sql should match azure-functions/src/lib/migrationSQL.ts content', () => {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);

    const sqlPath = path.resolve(__dirname, '../../db/migration.sql');
    const fileSql = fs.readFileSync(sqlPath, 'utf8');

    expect(normalizeSql(fileSql)).toBe(normalizeSql(migrationSQL));
  });
});

