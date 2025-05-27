-- Initialize the database schema for the task management application

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
                                     id SERIAL PRIMARY KEY,
                                     title VARCHAR(255) NOT NULL,
    description TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

-- Create index on completed status for better query performance
CREATE INDEX idx_tasks_completed ON tasks(completed);

-- Create index on created_at for sorting
CREATE INDEX idx_tasks_created_at ON tasks(created_at);

-- Insert some sample data
INSERT INTO tasks (title, description) VALUES
                                           ('Complete Infrastructure Project', 'Finish the Docker Compose multi-container application'),
                                           ('Write Documentation', 'Create comprehensive README and technical documentation'),
                                           ('Test SSL Configuration', 'Ensure HTTPS is working correctly with valid certificates'),
                                           ('Implement Multi-Stage Build', 'Create efficient Docker images using multi-stage builds'),
                                           ('Configure Environment Variables', 'Set up proper environment variable management');

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE
    ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();