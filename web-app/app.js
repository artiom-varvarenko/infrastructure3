const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Database connection
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check
app.get('/app/health', (req, res) => {
    res.json({ status: 'OK', service: 'web-app' });
});

// Home page
app.get('/app', (req, res) => {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Todo App</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .todo-form { margin-bottom: 20px; }
            .todo-item { margin: 10px 0; padding: 10px; background: #f0f0f0; }
        </style>
    </head>
    <body>
        <h1>Todo Application</h1>
        <div class="todo-form">
            <input type="text" id="todoInput" placeholder="Enter a todo...">
            <button onclick="addTodo()">Add Todo</button>
        </div>
        <div id="todoList"></div>
        
        <script>
            async function loadTodos() {
                const response = await fetch('/app/todos');
                const todos = await response.json();
                const todoList = document.getElementById('todoList');
                todoList.innerHTML = todos.map(todo => 
                    '<div class="todo-item">' + todo.title + '</div>'
                ).join('');
            }
            
            async function addTodo() {
                const input = document.getElementById('todoInput');
                const title = input.value;
                if (title) {
                    await fetch('/app/todos', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ title })
                    });
                    input.value = '';
                    loadTodos();
                }
            }
            
            loadTodos();
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
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

// Create todo
app.post('/app/todos', async (req, res) => {
    try {
        const { title } = req.body;
        const result = await pool.query(
            'INSERT INTO todos (title) VALUES ($1) RETURNING *',
            [title]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Database error' });
    }
});

app.listen(port, () => {
    console.log(`Web app listening on port ${port}`);
});