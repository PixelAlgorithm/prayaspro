"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runMigrations = runMigrations;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/prayaspro';
async function ensureDatabaseExists() {
    const parsed = new URL(dbUrl);
    const targetDbName = parsed.pathname.replace('/', '') || 'prayaspro';
    // Connect to default 'postgres' database to check/create target database
    const maintenanceUrl = `${parsed.protocol}//${parsed.username}:${parsed.password}@${parsed.host}/postgres`;
    const client = new pg_1.Client({ connectionString: maintenanceUrl });
    try {
        await client.connect();
        const res = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDbName]);
        if (res.rowCount === 0) {
            console.log(`Database '${targetDbName}' not found. Creating database...`);
            await client.query(`CREATE DATABASE "${targetDbName}"`);
            console.log(`Database '${targetDbName}' created successfully.`);
        }
        else {
            console.log(`Database '${targetDbName}' already exists.`);
        }
    }
    catch (err) {
        console.warn(`Could not verify/create database via maintenance connection: ${err.message}. Proceeding to direct connection.`);
    }
    finally {
        await client.end().catch(() => { });
    }
}
async function runMigrations() {
    console.log('====================================================');
    console.log('  PRAYASPRO DATABASE MIGRATION RUNNER               ');
    console.log('====================================================');
    await ensureDatabaseExists();
    const client = new pg_1.Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log(`Connected to target database: ${dbUrl.replace(/:[^:]*@/, ':****@')}`);
        // Create migrations tracker table
        await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version VARCHAR(100) PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `);
        const migrationsDir = path_1.default.resolve(__dirname, 'migrations');
        const files = fs_1.default.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
        for (const file of files) {
            const checkRes = await client.query('SELECT version FROM schema_migrations WHERE version = $1', [file]);
            if (checkRes.rowCount && checkRes.rowCount > 0) {
                console.log(`[SKIP] Migration already applied: ${file}`);
                continue;
            }
            console.log(`[APPLYING] Migration: ${file}...`);
            const filePath = path_1.default.join(migrationsDir, file);
            const sql = fs_1.default.readFileSync(filePath, 'utf-8');
            // Execute migration script
            await client.query(sql);
            // Record applied migration
            await client.query('INSERT INTO schema_migrations (version) VALUES ($1)', [file]);
            console.log(`[SUCCESS] Migration applied: ${file}`);
        }
        console.log('====================================================');
        console.log(' All database migrations completed successfully!    ');
        console.log('====================================================');
    }
    catch (error) {
        console.error('Migration failed:', error);
        process.exit(1);
    }
    finally {
        await client.end();
    }
}
if (require.main === module) {
    runMigrations();
}
