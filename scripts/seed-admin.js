import bcrypt from 'bcryptjs';
import pg from 'pg';
import * as readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

const { Client } = pg;

const rl = readline.createInterface({ input, output });

async function main() {
  console.log('\n🌱  TheDreamV Connect — Seed First Admin\n');

  const dbUrl  = process.env.DATABASE_URL;
  if (!dbUrl) { console.error('❌  DATABASE_URL not set in environment'); process.exit(1); }

  const email    = await rl.question('Admin email:    ');
  const name     = await rl.question('Admin name:     ');
  const password = await rl.question('Initial password (min 8 chars): ');
  rl.close();

  if (password.length < 8) { console.error('❌  Password too short'); process.exit(1); }

  const hash = await bcrypt.hash(password, 12);

  const client = new Client({ connectionString: dbUrl });
  await client.connect();

  const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
  if (existing.rows.length) {
    console.log('⚠️   User with that email already exists. Nothing changed.');
    await client.end(); process.exit(0);
  }

  const res = await client.query(
    `INSERT INTO users (email, password_hash, name, role, status, created_at, updated_at)
     VALUES ($1, $2, $3, 'super_admin', 'active', NOW(), NOW())
     RETURNING id, email, name, role`,
    [email.toLowerCase(), hash, name]
  );
  await client.end();

  console.log('\n✅  Super admin created:');
  console.table(res.rows);
  console.log('\nYou can now log in at your portal URL.\n');
}

main().catch(err => { console.error('❌ ', err.message); process.exit(1); });
