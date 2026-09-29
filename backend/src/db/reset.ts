import { Client } from 'pg';
import path from 'path';
import dotenv from 'dotenv';
import { runMigrations } from './migrate';
import { seedDatabase } from './seed';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/prayaspro';

async function resetDatabase() {
  console.log('====================================================');
  console.log('  PRAYASPRO COMPLETE DATABASE RESET                 ');
  console.log('====================================================');

  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    console.log('Dropping existing public schema objects...');
    await client.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
    console.log('Public schema reset complete.');
  } catch (err: any) {
    console.error('Error dropping schema:', err);
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }

  // Re-apply migrations
  console.log('\nRunning migrations...');
  await runMigrations();

  // Re-seed data
  console.log('\nRunning seed...');
  await seedDatabase();

  console.log('\nDatabase reset and re-seeded successfully!');
}

if (require.main === module) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
