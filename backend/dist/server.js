"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startServer = startServer;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
const connection_1 = require("./db/connection");
// Route imports
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const userRoutes_1 = __importDefault(require("./routes/userRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const applicationRoutes_1 = __importDefault(require("./routes/applicationRoutes"));
const assignmentRoutes_1 = __importDefault(require("./routes/assignmentRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const recommendationRoutes_1 = __importDefault(require("./routes/recommendationRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const dbShowcaseRoutes_1 = __importDefault(require("./routes/dbShowcaseRoutes"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Enable Cross-Origin Resource Sharing & JSON Parsing
app.use((0, cors_1.default)({
    origin: true,
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Health & System Info
app.get('/api/health', async (req, res) => {
    try {
        const dbTest = await (0, connection_1.query)(`
      SELECT 
        current_database() AS database,
        current_user AS user,
        version() AS pg_version,
        NOW() AS server_time,
        (SELECT COUNT(*) FROM tasks) AS total_tasks,
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM content_embeddings) AS total_embeddings
    `);
        res.json({
            status: 'UP',
            service: 'PrayasPro PostgreSQL Backend',
            timestamp: new Date().toISOString(),
            database: dbTest.rows[0]
        });
    }
    catch (err) {
        res.status(500).json({
            status: 'DOWN',
            error: err.message
        });
    }
});
// Mount Domain API Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/users', userRoutes_1.default);
app.use('/api/tasks', taskRoutes_1.default);
app.use('/api/applications', applicationRoutes_1.default);
app.use('/api/assignments', assignmentRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/recommendations', recommendationRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/db-showcase', dbShowcaseRoutes_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error('[Unhandled Backend Error]', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error'
    });
});
async function startServer() {
    const isConnected = await (0, connection_1.testConnection)();
    if (!isConnected) {
        console.error('CRITICAL: Cannot connect to PostgreSQL database. Server startup aborted.');
        process.exit(1);
    }
    const server = app.listen(PORT, () => {
        console.log('====================================================');
        console.log(`  PRAYASPRO BACKEND SERVER RUNNING ON PORT ${PORT} `);
        console.log(`  API Base: http://localhost:${PORT}/api            `);
        console.log(`  Health Check: http://localhost:${PORT}/api/health `);
        console.log(`  Database: PostgreSQL 18 + pgvector               `);
        console.log('====================================================');
    });
    return server;
}
if (require.main === module) {
    startServer();
}
exports.default = app;
