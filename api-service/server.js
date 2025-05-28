const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 4000;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', service: 'api-service' });
});

// Get database statistics
app.get('/api/stats', async (req, res) => {
    try {
        const result = await pool.query('SELECT COUNT(*) as total FROM todos');
        res.json({ totalTodos: result.rows[0].total });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Get system info
app.get('/api/info', (req, res) => {
    res.json({
        service: 'API Service',
        version: '1.0.0',
        environment: process.env.NODE_ENV,
        timestamp: new Date().toISOString()
    });
});

app.listen(port, () => {
    console.log(`API service listening on port ${port}`);
});