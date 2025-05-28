const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const path = require('path'); // Add this import

const app = express();
const port = process.env.PORT || 3000;

// Database connection with error handling
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

// Test database connection
pool.connect((err, client, release) => {
    if (err) {
        console.error('Error connecting to database:', err.stack);
    } else {
        console.log('Successfully connected to PostgreSQL database');
        release();
    }
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check with database status
app.get('/app/health', async (req, res) => {
    try {
        await pool.query('SELECT 1');
        res.json({
            status: 'OK',
            service: 'web-app',
            database: 'connected'
        });
    } catch (err) {
        res.status(503).json({
            status: 'ERROR',
            service: 'web-app',
            database: 'disconnected',
            error: err.message
        });
    }
});

// Dashboard route - ADD THIS BEFORE THE MAIN /app ROUTE
app.get('/app/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Enhanced home page with modern UI - now with dashboard link
app.get('/app', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Todo App - Database Interaction Demo</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                background: #f5f5f5;
                color: #333;
                line-height: 1.6;
            }
            .container {
                max-width: 800px;
                margin: 0 auto;
                padding: 20px;
            }
            h1 {
                text-align: center;
                color: #2c3e50;
                margin-bottom: 30px;
                font-size: 2.5em;
            }
            .dashboard-link {
                position: fixed;
                top: 20px;
                right: 20px;
                background: #9b59b6;
                color: white;
                padding: 10px 20px;
                border-radius: 8px;
                text-decoration: none;
                font-weight: 600;
                transition: background 0.3s;
            }
            .dashboard-link:hover {
                background: #8e44ad;
            }
            .stats-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 20px;
                margin-bottom: 30px;
            }
            .stat-card {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                text-align: center;
            }
            .stat-card h3 {
                color: #7f8c8d;
                font-size: 0.9em;
                margin-bottom: 10px;
                text-transform: uppercase;
            }
            .stat-value {
                font-size: 2em;
                font-weight: bold;
                color: #3498db;
            }
            .todo-form {
                background: white;
                padding: 20px;
                border-radius: 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                margin-bottom: 20px;
            }
            .form-group {
                display: flex;
                gap: 10px;
            }
            input[type="text"] {
                flex: 1;
                padding: 12px;
                border: 2px solid #ddd;
                border-radius: 5px;
                font-size: 16px;
                transition: border-color 0.3s;
            }
            input[type="text"]:focus {
                outline: none;
                border-color: #3498db;
            }
            button {
                padding: 12px 24px;
                background: #3498db;
                color: white;
                border: none;
                border-radius: 5px;
                font-size: 16px;
                cursor: pointer;
                transition: background 0.3s;
            }
            button:hover {
                background: #2980b9;
            }
            button:disabled {
                background: #95a5a6;
                cursor: not-allowed;
            }
            .todo-list {
                background: white;
                border-radius: 10px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            .todo-item {
                display: flex;
                align-items: center;
                padding: 15px 20px;
                border-bottom: 1px solid #ecf0f1;
                transition: background 0.2s;
            }
            .todo-item:hover {
                background: #f8f9fa;
            }
            .todo-item:last-child {
                border-bottom: none;
            }
            .todo-item.completed .todo-title {
                text-decoration: line-through;
                color: #95a5a6;
            }
            .todo-checkbox {
                width: 20px;
                height: 20px;
                margin-right: 15px;
                cursor: pointer;
            }
            .todo-title {
                flex: 1;
                font-size: 16px;
            }
            .todo-meta {
                font-size: 12px;
                color: #95a5a6;
                margin-left: 15px;
            }
            .todo-actions {
                display: flex;
                gap: 10px;
            }
            .btn-delete {
                background: #e74c3c;
                padding: 5px 10px;
                font-size: 14px;
            }
            .btn-delete:hover {
                background: #c0392b;
            }
            .loading {
                text-align: center;
                padding: 20px;
                color: #7f8c8d;
            }
            .error {
                background: #fee;
                color: #c33;
                padding: 10px;
                border-radius: 5px;
                margin-bottom: 20px;
            }
            .db-status {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: white;
                padding: 10px 20px;
                border-radius: 20px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .status-indicator {
                width: 10px;
                height: 10px;
                border-radius: 50%;
                background: #2ecc71;
                animation: pulse 2s infinite;
            }
            .status-indicator.error {
                background: #e74c3c;
                animation: none;
            }
            @keyframes pulse {
                0% { opacity: 1; }
                50% { opacity: 0.5; }
                100% { opacity: 1; }
            }
        </style>
    </head>
    <body>
        <a href="/app/dashboard" class="dashboard-link">📊 Database Dashboard</a>
        
        <div class="container">
            <h1>Todo Application</h1>
            
            <div class="stats-container">
                <div class="stat-card">
                    <h3>Total Todos</h3>
                    <div class="stat-value" id="totalTodos">-</div>
                </div>
                <div class="stat-card">
                    <h3>Completed</h3>
                    <div class="stat-value" id="completedTodos">-</div>
                </div>
                <div class="stat-card">
                    <h3>Pending</h3>
                    <div class="stat-value" id="pendingTodos">-</div>
                </div>
            </div>

            <div class="todo-form">
                <form id="todoForm" class="form-group">
                    <input type="text" id="todoInput" placeholder="What needs to be done?" required>
                    <button type="submit" id="addButton">Add Todo</button>
                </form>
            </div>

            <div id="errorMessage" class="error" style="display: none;"></div>

            <div class="todo-list" id="todoList">
                <div class="loading">Loading todos...</div>
            </div>
        </div>

        <div class="db-status">
            <div class="status-indicator" id="dbIndicator"></div>
            <span id="dbStatusText">Database Connected</span>
        </div>
        
        <script>
            let todos = [];
            
            // Load todos and stats on page load
            async function loadData() {
                await loadTodos();
                await loadStats();
                checkDatabaseStatus();
            }
            
            // Check database status
            async function checkDatabaseStatus() {
                try {
                    const response = await fetch('/app/health');
                    const data = await response.json();
                    
                    const indicator = document.getElementById('dbIndicator');
                    const statusText = document.getElementById('dbStatusText');
                    
                    if (data.database === 'connected') {
                        indicator.classList.remove('error');
                        statusText.textContent = 'Database Connected';
                    } else {
                        indicator.classList.add('error');
                        statusText.textContent = 'Database Disconnected';
                    }
                } catch (err) {
                    const indicator = document.getElementById('dbIndicator');
                    const statusText = document.getElementById('dbStatusText');
                    indicator.classList.add('error');
                    statusText.textContent = 'Connection Error';
                }
            }
            
            // Load todos from database
            async function loadTodos() {
                try {
                    const response = await fetch('/app/todos');
                    todos = await response.json();
                    renderTodos();
                    updateLocalStats();
                } catch (err) {
                    showError('Failed to load todos: ' + err.message);
                }
            }
            
            // Load stats from API service
            async function loadStats() {
                try {
                    const response = await fetch('/api/stats');
                    const stats = await response.json();
                    document.getElementById('totalTodos').textContent = stats.totalTodos || 0;
                } catch (err) {
                    console.error('Failed to load stats from API:', err);
                }
            }
            
            // Update local stats
            function updateLocalStats() {
                const total = todos.length;
                const completed = todos.filter(todo => todo.completed).length;
                const pending = total - completed;
                
                document.getElementById('totalTodos').textContent = total;
                document.getElementById('completedTodos').textContent = completed;
                document.getElementById('pendingTodos').textContent = pending;
            }
            
            // Render todos
            function renderTodos() {
                const todoList = document.getElementById('todoList');
                
                if (todos.length === 0) {
                    todoList.innerHTML = '<div class="loading">No todos yet. Add one above!</div>';
                    return;
                }
                
                todoList.innerHTML = todos.map(todo => {
                    const createdAt = new Date(todo.created_at).toLocaleDateString();
                    return \`
                        <div class="todo-item \${todo.completed ? 'completed' : ''}">
                            <input type="checkbox" class="todo-checkbox" 
                                   \${todo.completed ? 'checked' : ''} 
                                   onchange="toggleTodo(\${todo.id}, this.checked)">
                            <span class="todo-title">\${escapeHtml(todo.title)}</span>
                            <span class="todo-meta">ID: \${todo.id} | Created: \${createdAt}</span>
                            <div class="todo-actions">
                                <button class="btn-delete" onclick="deleteTodo(\${todo.id})">Delete</button>
                            </div>
                        </div>
                    \`;
                }).join('');
            }
            
            // Add new todo
            document.getElementById('todoForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const input = document.getElementById('todoInput');
                const button = document.getElementById('addButton');
                const title = input.value.trim();
                
                if (!title) return;
                
                button.disabled = true;
                button.textContent = 'Adding...';
                
                try {
                    const response = await fetch('/app/todos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title })
                    });
                    
                    if (!response.ok) throw new Error('Failed to add todo');
                    
                    input.value = '';
                    await loadData();
                    hideError();
                } catch (err) {
                    showError('Failed to add todo: ' + err.message);
                } finally {
                    button.disabled = false;
                    button.textContent = 'Add Todo';
                }
            });
            
            // Toggle todo completion
            async function toggleTodo(id, completed) {
                try {
                    const response = await fetch(\`/app/todos/\${id}\`, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completed })
                    });
                    
                    if (!response.ok) throw new Error('Failed to update todo');
                    
                    await loadData();
                } catch (err) {
                    showError('Failed to update todo: ' + err.message);
                    await loadTodos(); // Reload to reset checkbox
                }
            }
            
            // Delete todo
            async function deleteTodo(id) {
                if (!confirm('Are you sure you want to delete this todo?')) return;
                
                try {
                    const response = await fetch(\`/app/todos/\${id}\`, {
                        method: 'DELETE'
                    });
                    
                    if (!response.ok) throw new Error('Failed to delete todo');
                    
                    await loadData();
                } catch (err) {
                    showError('Failed to delete todo: ' + err.message);
                }
            }
            
            // Error handling
            function showError(message) {
                const errorDiv = document.getElementById('errorMessage');
                errorDiv.textContent = message;
                errorDiv.style.display = 'block';
            }
            
            function hideError() {
                document.getElementById('errorMessage').style.display = 'none';
            }
            
            // Escape HTML
            function escapeHtml(text) {
                const map = {
                    '&': '&amp;',
                    '<': '&lt;',
                    '>': '&gt;',
                    '"': '&quot;',
                    "'": '&#039;'
                };
                return text.replace(/[&<>"']/g, m => map[m]);
            }
            
            // Initial load
            loadData();
            
            // Refresh stats every 10 seconds
            setInterval(() => {
                loadStats();
                checkDatabaseStatus();
            }, 10000);
        </script>
    </body>
    </html>
    `);
});

// Get all todos
app.get('/app/todos', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM todos ORDER BY id DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Create todo
app.post('/app/todos', async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        const result = await pool.query(
            'INSERT INTO todos (title) VALUES ($1) RETURNING *',
            [title]
        );

        console.log('Todo created:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Update todo (toggle completion)
app.patch('/app/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { completed } = req.body;

        const result = await pool.query(
            'UPDATE todos SET completed = $1 WHERE id = $2 RETURNING *',
            [completed, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        console.log('Todo updated:', result.rows[0]);
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Delete todo
app.delete('/app/todos/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const result = await pool.query(
            'DELETE FROM todos WHERE id = $1 RETURNING *',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Todo not found' });
        }

        console.log('Todo deleted:', result.rows[0]);
        res.json({ message: 'Todo deleted', todo: result.rows[0] });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error', details: err.message });
    }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('SIGTERM received, closing database pool...');
    await pool.end();
    process.exit(0);
});

app.listen(port, () => {
    console.log(`Web app listening on port ${port}`);
    console.log(`Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
});