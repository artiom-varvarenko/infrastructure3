-- Initialize database schema
CREATE TABLE IF NOT EXISTS todos (
                                     id SERIAL PRIMARY KEY,
                                     title VARCHAR(255) NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Insert sample data
INSERT INTO todos (title) VALUES
                              ('Complete Infrastructure 3 Project'),
                              ('Test Docker Compose setup'),
                              ('Document the application');