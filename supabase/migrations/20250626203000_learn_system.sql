-- Create course categories table
CREATE TABLE IF NOT EXISTS course_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category_id INTEGER NOT NULL REFERENCES course_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create modules table
CREATE TABLE IF NOT EXISTS modules (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  file_url TEXT,
  module_id INTEGER NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_category_id ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_modules_course_id ON modules(course_id);
CREATE INDEX IF NOT EXISTS idx_notes_module_id ON notes(module_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_course_categories_updated_at BEFORE UPDATE ON course_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_modules_updated_at BEFORE UPDATE ON modules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notes_updated_at BEFORE UPDATE ON notes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO course_categories (name, slug) VALUES 
  ('Diploma', 'diploma'),
  ('Degree', 'degree'),
  ('VETA', 'veta')
ON CONFLICT (name) DO NOTHING;

-- Insert sample courses
INSERT INTO courses (title, description, category_id) VALUES 
  ('Computer Science', 'Introduction to computer science fundamentals', 1),
  ('Information Technology', 'IT concepts and applications', 1),
  ('Software Engineering', 'Software development principles', 2),
  ('Web Development', 'Modern web development technologies', 3)
ON CONFLICT DO NOTHING;

-- Insert sample modules
INSERT INTO modules (title, description, course_id) VALUES 
  ('Programming Basics', 'Introduction to programming concepts', 1),
  ('Data Structures', 'Understanding data organization', 1),
  ('Database Design', 'Database concepts and SQL', 2),
  ('Network Security', 'Network security fundamentals', 2),
  ('Software Architecture', 'Design patterns and architecture', 3),
  ('Frontend Development', 'HTML, CSS, and JavaScript', 4)
ON CONFLICT DO NOTHING;

-- Insert sample notes
INSERT INTO notes (title, content, module_id) VALUES 
  ('Programming Fundamentals', 'Programming is the process of creating a set of instructions that tell a computer how to perform a task.', 1),
  ('Variables and Data Types', 'Variables are containers for storing data values. Different data types include integers, strings, booleans, etc.', 1),
  ('Arrays and Lists', 'Arrays are collections of elements stored at contiguous memory locations.', 2),
  ('SQL Basics', 'SQL is a standard language for storing, manipulating and retrieving data in databases.', 3)
ON CONFLICT DO NOTHING; 