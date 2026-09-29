"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.query = query;
exports.getClient = getClient;
exports.withTransaction = withTransaction;
exports.testConnection = testConnection;
const pg_1 = require("pg");
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from backend/.env
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../../.env') });
const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:root@localhost:5432/prayaspro';
exports.pool = new pg_1.Pool({
    connectionString,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});
exports.pool.on('error', (err) => {
    console.error('[PostgreSQL Pool Error]', err);
});
async function query(text, params) {
    const start = Date.now();
    const res = await exports.pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.DEBUG_SQL === 'true') {
        console.log('[SQL Execution]', { text, duration: `${duration}ms`, rows: res.rowCount });
    }
    return res;
}
async function getClient() {
    return await exports.pool.connect();
}
/**
 * Execute an atomic transaction safely with automatic rollback on error.
 */
async function withTransaction(callback) {
    const client = await exports.pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    }
    catch (error) {
        await client.query('ROLLBACK');
        throw error;
    }
    finally {
        client.release();
    }
}
async function testConnection() {
    try {
        const res = await exports.pool.query('SELECT current_database(), current_user, version()');
        console.log('Connected to PostgreSQL successfully:');
        console.log(`Database: ${res.rows[0].current_database}`);
        console.log(`User: ${res.rows[0].current_user}`);
        return true;
    }
    catch (error) {
        console.error('Failed to connect to PostgreSQL:', error);
        return false;
    }
}
