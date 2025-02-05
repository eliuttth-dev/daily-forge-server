CREATE TABLE IF NOT EXISTS schedules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    habit_id INT NOT NULL UNIQUE,
    type VARCHAR(50) CHECK (type IN ('daily', 'weekly', 'custom')),
    times_per_day INT NOT NULL CHECK (times_per_day > 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (habit_id) REFERENCES habits(id) ON DELETE CASCADE 
);
