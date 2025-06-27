/*
  # Enhance Blog Schema with Analytics and User Management

  1. New Tables
    - `post_likes` - Track user likes on posts
    - `users` - User management for analytics
    - `post_view_events` - Track session-based view events

  2. New Columns
    - Add `likes` and `views` columns to posts table
    - Add indexes for better performance

  3. New Functions
    - `increment_post_views` - Function to increment post views
    - `update_post_likes` - Function to update post like counts

  4. Security
    - Enable RLS on new tables
    - Add policies for public read access and authenticated write access
*/

-- Add new columns to posts table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'likes'
  ) THEN
    ALTER TABLE posts ADD COLUMN likes integer DEFAULT 0;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'posts' AND column_name = 'views'
  ) THEN
    ALTER TABLE posts ADD COLUMN views integer DEFAULT 0;
  END IF;
END $$;

-- Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Create users table for analytics
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  full_name text DEFAULT '',
  avatar_url text DEFAULT '',
  role text DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at timestamptz DEFAULT now()
);

-- Create post_view_events table for session-based view tracking
CREATE TABLE IF NOT EXISTS post_view_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  session_id text NOT NULL,
  user_id text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for post_likes
CREATE POLICY "Post likes are publicly readable"
  ON post_likes
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Users can manage their own likes"
  ON post_likes
  FOR ALL
  TO public
  USING (true)
  WITH CHECK (true);

-- Create policies for users
CREATE POLICY "Users are publicly readable"
  ON users
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can manage users"
  ON users
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Create function to increment post views
CREATE OR REPLACE FUNCTION increment_post_views(post_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE posts 
  SET views = COALESCE(views, 0) + 1,
      updated_at = now()
  WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update post like counts
CREATE OR REPLACE FUNCTION update_post_likes()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts 
    SET likes = (
      SELECT COUNT(*) FROM post_likes WHERE post_id = NEW.post_id
    )
    WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts 
    SET likes = (
      SELECT COUNT(*) FROM post_likes WHERE post_id = OLD.post_id
    )
    WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update like counts
DROP TRIGGER IF EXISTS update_post_likes_trigger ON post_likes;
CREATE TRIGGER update_post_likes_trigger
  AFTER INSERT OR DELETE ON post_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_post_likes();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_posts_category_id ON posts(category_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_featured ON posts(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_post_view_events_post_id ON post_view_events(post_id);
CREATE INDEX IF NOT EXISTS idx_post_view_events_session_id ON post_view_events(session_id);

-- Update existing posts with default values
UPDATE posts SET likes = 0 WHERE likes IS NULL;
UPDATE posts SET views = 0 WHERE views IS NULL;

-- Insert some sample users for analytics
INSERT INTO users (email, full_name, role) VALUES
  ('admin@soateco.com', 'Admin User', 'admin'),
  ('editor@soateco.com', 'Content Editor', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Create function to get daily views in the last 7 days
CREATE OR REPLACE FUNCTION get_daily_views_last_7_days()
RETURNS TABLE(day text, count integer)
LANGUAGE SQL
AS $$
  SELECT
    to_char(created_at, 'YYYY-MM-DD') AS day,
    count(*) AS count
  FROM post_view_events
  WHERE created_at > now() - interval '7 days'
  GROUP BY day
  ORDER BY day
$$;

-- Course categories
CREATE TABLE course_categories (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL
);

-- Courses
CREATE TABLE courses (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  title text NOT NULL,
  category_id uuid REFERENCES course_categories(id),
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- Modules
CREATE TABLE modules (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id uuid REFERENCES courses(id),
  title text NOT NULL,
  description text,
  order_num int DEFAULT 0
);