/**
 * Azure PostgreSQL에 lesson_contents 테이블 생성 스크립트
 */

import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  const client = new Client({
    host: 'psql-landing-page-pro.postgres.database.azure.com',
    database: 'landingpagepro',
    user: 'pgadmin',
    password: 'LandingPage2025!@#Strong',
    port: 5432,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    console.log('Connecting to Azure PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!');

    // SQL 파일 읽기
    const sqlPath = path.join(__dirname, 'create-lesson-contents-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing migration SQL...');
    await client.query(sql);
    console.log('✅ Migration completed successfully!');
    console.log('lesson_contents 테이블이 생성되었습니다.');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('Connection closed.');
  }
}

runMigration();
