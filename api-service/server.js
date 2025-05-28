const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;

// Database connection with connection pooling
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    max: 20, // Maximum number of clients in the pool
    idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
    connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
});

// Test database connection on startup
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('API Service successfully connected to PostgreSQL database');
        release();
    }
});

app.use(express.json());

// CORS headers for cross-origin requests (if needed)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    next();
});

// Enhanced health check with database status
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        const dbCheck = await pool.query('SELECT NOW() as current_time, version() as pg_version');

        res.json({
            status: 'OK',
            service: 'api-service',
            timestamp: new Date().toISOString(),
            database: {
                connected: true,
                time: dbCheck.rows[0].current_time,
                version: dbCheck.rows[0].pg_version
            },
            pool: {
                totalCount: pool.totalCount,
                idleCount: pool.idleCount,
                waitingCount: pool.waitingCount
            }
        });
    } catch (err) {
        res.status(503).json({
            status: 'ERROR',
            service: 'api-service',
            timestamp: new Date().toISOString(),
            database: {
                connected: false,
                error: err.message
            }
        });
    }
});

// Get detailed database statistics
app.get('/api/stats', async (req, res) => {
    try {
        // Run multiple queries in parallel
        const [totalResult, completedResult, recentResult, oldestResult] = await Promise.all([
            pool.query('SELECT COUNT(*) as total FROM todos'),
            pool.query('SELECT COUNT(*) as completed FROM todos WHERE completed = true'),
            pool.query('SELECT COUNT(*) as recent FROM todos WHERE created_at > NOW() - INTERVAL \'24 hours\''),
            pool.query('SELECT MIN(created_at) as oldest_date FROM todos')
        ]);

        const total = parseInt(totalResult.rows[0].total);
        const completed = parseInt(completedResult.rows[0].completed);
        const completionRate = total > 0 ? ((completed / total) * 100).toFixed(1) : 0;

        res.json({
            totalTodos: total,
            completedTodos: completed,
            pendingTodos: total - completed,
            completionRate: parseFloat(completionRate),
            recentTodos: parseInt(recentResult.rows[0].recent),
            oldestTodoDate: oldestResult.rows[0].oldest_date
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Get system and database info
app.get('/api/info', async (req, res) => {
    try {
        // Get database size
        const dbSizeResult = await pool.query(`
            SELECT pg_database_size(current_database()) as db_size,
                   pg_size_pretty(pg_database_size(current_database())) as db_size_pretty
        `);

        // Get table information
        const tableInfoResult = await pool.query(`
            SELECT 
                schemaname,
                tablename,
                pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
                n_live_tup as row_count
            FROM pg_stat_user_tables
            WHERE schemaname = 'public'
        `);

        res.json({
            service: 'API Service',
            version: '1.0.0',
            environment: process.env.NODE_ENV || 'development',
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            database: {
                host: process.env.DB_HOST,
                port: process.env.DB_PORT,
                name: process.env.DB_NAME,
                size: dbSizeResult.rows[0].db_size_pretty,
                sizeBytes: parseInt(dbSizeResult.rows[0].db_size)
            },
            tables: tableInfoResult.rows,
            nodejs: {
                version: process.version,
                memory: process.memoryUsage()
            }
        });
    } catch (err) {
        console.error('Error getting system info:', err);
        res.status(500).json({ error: 'Failed to get system info', details: err.message });
    }
});

// Get todos with pagination and filtering
app.get('/api/todos', async (req, res) => {
    try {
        const {
            limit = 10,
            offset = 0,
            completed = null,
            search = '',
            sort = 'id',
            order = 'DESC'
        } = req.query;

        let query = 'SELECT * FROM todos WHERE 1=1';
        const params = [];

        // Add filters
        if (completed !== null && completed !== '') {
            params.push(completed === 'true');
            query += ` AND completed = $${params.length}`;
        }

        if (search) {
            params.push(`%${search}%`);
            query += ` AND title ILIKE $${params.length}`;
        }

        // Add sorting
        const allowedSorts = ['id', 'title', 'created_at', 'completed'];
        const allowedOrders = ['ASC', 'DESC'];
        const safeSort = allowedSorts.includes(sort) ? sort : 'id';
        const safeOrder = allowedOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';
        query += ` ORDER BY ${safeSort} ${safeOrder}`;

        // Add pagination
        params.push(limit);
        query += ` LIMIT $${params.length}`;
        params.push(offset);
        query += ` OFFSET $${params.length}`;

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM todos WHERE 1=1';
        const countParams = [];

        if (completed !== null && completed !== '') {
            countParams.push(completed === 'true');
            countQuery += ` AND completed = $${countParams.length}`;
        }

        if (search) {
            countParams.push(`%${search}%`);
            countQuery += ` AND title ILIKE $${countParams.length}`;
        }

        const [todosResult, countResult] = await Promise.all([
            pool.query(query, params),
            pool.query(countQuery, countParams)
        ]);

        res.json({
            todos: todosResult.rows,
            pagination: {
                total: parseInt(countResult.rows[0].total),
                limit: parseInt(limit),
                offset: parseInt(offset),
                pages: Math.ceil(countResult.rows[0].total / limit)
            }
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Get todo analytics
app.get('/api/analytics', async (req, res) => {
    try {
        // Daily creation stats for the last 7 days
        const dailyStatsResult = await pool.query(`
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as todos_created,
                SUM(CASE WHEN completed = true THEN 1 ELSE 0 END) as todos_completed
            FROM todos
            WHERE created_at > NOW() - INTERVAL '7 days'
            GROUP BY DATE(created_at)
            ORDER BY date DESC
        `);

        // Hourly distribution
        const hourlyResult = await pool.query(`
            SELECT 
                EXTRACT(HOUR FROM created_at) as hour,
                COUNT(*) as count
            FROM todos
            GROUP BY EXTRACT(HOUR FROM created_at)
            ORDER BY hour
        `);

        // Average completion time (for completed todos)
        const avgCompletionResult = await pool.query(`
            SELECT 
                AVG(EXTRACT(EPOCH FROM (NOW() - created_at))/3600) as avg_hours_to_complete
            FROM todos
            WHERE completed = true
        `);

        res.json({
            dailyStats: dailyStatsResult.rows,
            hourlyDistribution: hourlyResult.rows,
            averageCompletionHours: avgCompletionResult.rows[0].avg_hours_to_complete || 0,
            generatedAt: new Date().toISOString()
        });
    } catch (err) {
        console.error('Analytics error:', err);
        res.status(500).json({ error: 'Failed to generate analytics', details: err.message });
    }
});

// Database query endpoint (for testing - be careful in production!)
app.post('/api/query', async (req, res) => {
    // Only allow in development mode
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ error: 'Query endpoint disabled in production' });
    }

    try {
        const { query } = req.body;

        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }

        // Basic safety check - only allow SELECT queries
        if (!query.trim().toUpperCase().startsWith('SELECT')) {
            return res.status(403).json({ error: 'Only SELECT queries are allowed' });
        }

        console.log('Executing query:', query);
        const result = await pool.query(query);

        res.json({
            rows: result.rows,
            rowCount: result.rowCount,
            fields: result.fields.map(f => ({ name: f.name, dataType: f.dataTypeID }))
        });
    } catch (err) {
        console.error('Query error:', err);
        res.status(500).json({ error: 'Query error', details: err.message });
    }
});

// Get database connection pool stats
app.get('/api/pool-stats', (req, res) => {
    res.json({
        totalCount: pool.totalCount,
        idleCount: pool.idleCount,
        waitingCount: pool.waitingCount,
        maxClients: pool.options.max,
        idleTimeoutMillis: pool.options.idleTimeoutMillis,
        connectionTimeoutMillis: pool.options.connectionTimeoutMillis
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        error: 'Internal server error',
        message: err.message,
        timestamp: new Date().toISOString()
    });
});

// Handle 404
app.use((req, res) => {
    res.status(404).json({
        error: 'Not found',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database pool...');
    await pool.end();
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log('SIGINT received, closing database pool...');
    await pool.end();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`API service listening on port ${port}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});