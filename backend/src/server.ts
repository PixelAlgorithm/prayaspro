import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { testConnection, query } from './db/connection';

// Route imports
import authRoutes from './routes/authRoutes';
import userRoutes from './routes/userRoutes';
import taskRoutes from './routes/taskRoutes';
import applicationRoutes from './routes/applicationRoutes';
import assignmentRoutes from './routes/assignmentRoutes';
import reviewRoutes from './routes/reviewRoutes';
import recommendationRoutes from './routes/recommendationRoutes';
import adminRoutes from './routes/adminRoutes';
import dbShowcaseRoutes from './routes/dbShowcaseRoutes';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// Enable Cross-Origin Resource Sharing & JSON Parsing
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health & System Info
app.get('/api/health', async (req, res) => {
  try {
    const dbTest = await query(`
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
  } catch (err: any) {
    res.status(500).json({
      status: 'DOWN',
      error: err.message
    });
  }
});

// Mount Domain API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/db-showcase', dbShowcaseRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Unhandled Backend Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error'
  });
});

export async function startServer() {
  const isConnected = await testConnection();
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

export default app;
