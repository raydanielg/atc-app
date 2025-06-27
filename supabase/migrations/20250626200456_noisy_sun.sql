/*
  # Create Blog Schema for Soateco App

  1. New Tables
    - `categories`
      - `id` (uuid, primary key)
      - `name` (text, unique)
      - `slug` (text, unique)
      - `description` (text)
      - `color` (text, for UI theming)
      - `image_url` (text)
      - `created_at` (timestamp)
    
    - `posts`
      - `id` (uuid, primary key)
      - `title` (text, required)
      - `content` (text, required)
      - `excerpt` (text, required)
      - `image_url` (text)
      - `category_id` (uuid, foreign key)
      - `author` (text, required)
      - `slug` (text, unique)
      - `featured` (boolean, default false)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for public read access (suitable for blog content)
    - Add policies for authenticated write access (for content management)
*/

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  slug text UNIQUE NOT NULL,
  description text DEFAULT '',
  color text DEFAULT '#FF5722',
  image_url text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  excerpt text NOT NULL,
  image_url text DEFAULT '',
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  author text NOT NULL DEFAULT 'Soateco Team',
  slug text UNIQUE NOT NULL,
  featured boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Create policies for public read access (blog content should be publicly readable)
CREATE POLICY "Categories are publicly readable"
  ON categories
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Posts are publicly readable"
  ON posts
  FOR SELECT
  TO public
  USING (true);

-- Create policies for authenticated write access
CREATE POLICY "Authenticated users can manage categories"
  ON categories
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can manage posts"
  ON posts
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insert sample categories
INSERT INTO categories (name, slug, description, color) VALUES
  ('Architecture', 'architecture', 'Modern architecture and design trends for student spaces', '#2196F3'),
  ('Business', 'business', 'Student entrepreneurship and business development', '#4CAF50'),
  ('Technology', 'technology', 'Latest tech trends and digital innovations', '#9C27B0'),
  ('Design', 'design', 'Creative design and visual arts', '#FF9800'),
  ('Events', 'events', 'Student organization events and activities', '#F44336'),
  ('News', 'news', 'Latest news and announcements', '#607D8B')
ON CONFLICT (slug) DO NOTHING;

-- Insert sample posts
INSERT INTO posts (title, content, excerpt, image_url, category_id, author, slug, featured) VALUES
  (
    'Modern Monochrome Home with Calm and Cozy Terrace',
    'This modern monochrome home showcases the perfect balance between minimalist design and comfortable living. The clean lines and neutral color palette create a serene environment that promotes focus and relaxation - essential elements for student life.

    The architectural approach emphasizes open spaces and natural light, creating an atmosphere conducive to both study and social interaction. The careful selection of materials and furnishings demonstrates how thoughtful design can enhance the quality of student accommodation.

    Key features include:
    - Open floor plans that maximize space efficiency
    - Strategic use of natural lighting to reduce energy costs
    - Multipurpose furniture designed for student needs
    - Sustainable materials that support environmental responsibility

    The integration of indoor and outdoor spaces through the terrace design creates additional areas for relaxation and social gatherings, addressing the diverse needs of student organizations and communities.',
    'Discover how modern monochrome design principles can transform student living spaces into havens of productivity and comfort.',
    'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
    (SELECT id FROM categories WHERE slug = 'architecture'),
    'Sarah Johnson',
    'modern-monochrome-home-calm-cozy-terrace',
    true
  ),
  (
    'Study 2020: Fake Engagement is Only Half the Problem',
    'Recent research into student engagement reveals that superficial participation in academic and organizational activities represents only a fraction of the challenges facing modern educational institutions. This comprehensive study examines the underlying factors that contribute to genuine student involvement.

    The research methodology included surveys of over 2,000 students across various institutions, focus groups with student organization leaders, and analysis of participation patterns in different academic and extracurricular activities.

    Key findings include:
    - 68% of students report feeling disconnected from their academic communities
    - Traditional engagement metrics fail to capture meaningful participation
    - Student organizations play a crucial role in fostering authentic connections
    - Technology can both help and hinder genuine engagement efforts

    The implications of these findings extend beyond individual student success to encompass the broader health of academic institutions and the effectiveness of student support systems.',
    'New research reveals the complex nature of student engagement and offers insights into building more meaningful educational communities.',
    'https://images.pexels.com/photos/3184298/pexels-photo-3184298.jpeg',
    (SELECT id FROM categories WHERE slug = 'news'),
    'Dr. Michael Chen',
    'study-2020-fake-engagement-half-problem',
    true
  ),
  (
    'Another Big Apartment Project Slated for Broad Ripple Company',
    'The latest development in student housing comes with the announcement of a major apartment complex designed specifically for university communities. This project represents a significant investment in student-centered living solutions.

    The development will feature:
    - 300 units designed for student occupancy
    - Integrated study spaces and collaboration areas
    - Sustainable building practices and energy-efficient systems
    - Proximity to major university campuses and public transportation

    This project addresses the growing demand for quality student housing while incorporating modern amenities and sustainability features that appeal to environmentally conscious students.',
    'A new apartment complex promises to revolutionize student living with innovative design and sustainable features.',
    'https://images.pexels.com/photos/1643383/pexels-photo-1643383.jpeg',
    (SELECT id FROM categories WHERE slug = 'architecture'),
    'Jennifer Williams',
    'apartment-project-broad-ripple-company',
    false
  ),
  (
    'Patricia Urquiola Coats Transparent Glas Tables for Kartell',
    'Renowned designer Patricia Urquiola has created a stunning collection of transparent glass tables that exemplify the intersection of functional design and artistic expression. These pieces offer valuable insights for student spaces and collaborative environments.

    The collection demonstrates key design principles:
    - Transparency to create visual space in small areas
    - Durability suitable for high-traffic student environments
    - Versatility in function and aesthetic appeal
    - Integration with various interior design styles

    For student organizations and campus spaces, these design concepts offer practical solutions for creating flexible, appealing environments that support both individual work and group collaboration.',
    'Explore how innovative furniture design can transform student spaces and enhance collaborative learning environments.',
    'https://images.pexels.com/photos/1571460/pexels-photo-1571460.jpeg',
    (SELECT id FROM categories WHERE slug = 'design'),
    'Maria Rodriguez',
    'patricia-urquiola-transparent-glass-tables-kartell',
    false
  ),
  (
    'Ambrose Seeks Offers on Downtown Building for Apartments',
    'The conversion of downtown commercial buildings into student housing represents a growing trend in urban development. This project showcases innovative approaches to adaptive reuse and community development.

    The proposed conversion includes:
    - Preservation of historic architectural elements
    - Modern amenities tailored to student needs
    - Integration with existing campus infrastructure
    - Sustainable renovation practices

    This development model offers insights for student organizations interested in community development and sustainable urban planning initiatives.',
    'Downtown building conversion project demonstrates innovative approaches to student housing and urban development.',
    'https://images.pexels.com/photos/3184291/pexels-photo-3184291.jpeg',
    (SELECT id FROM categories WHERE slug = 'business'),
    'Robert Anderson',
    'ambrose-seeks-offers-downtown-building-apartments',
    false
  ),
  (
    'Tahu Blue Retreat is a Converted Tower on the Cliff',
    'This remarkable architectural transformation demonstrates how creative vision can repurpose existing structures into inspiring spaces. The project offers valuable lessons for student organizations interested in innovative space utilization.

    The conversion process involved:
    - Structural assessment and safety improvements
    - Integration of modern amenities with historic character
    - Sustainable design practices and energy efficiency
    - Creation of flexible spaces for multiple uses

    Student organizations can apply these principles to their own space planning and renovation projects, creating environments that inspire creativity and collaboration.',
    'A converted tower showcases innovative approaches to architectural transformation and space utilization.',
    'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg',
    (SELECT id FROM categories WHERE slug = 'architecture'),
    'Lisa Thompson',
    'tahu-blue-retreat-converted-tower-cliff',
    false
  )
ON CONFLICT (slug) DO NOTHING;

-- Allow authenticated users to insert (upload)
CREATE POLICY "Authenticated users can upload files"
  ON storage.objects
  FOR INSERT
  TO authenticated
  USING (bucket_id = 'notes');

-- Allow authenticated users to update/delete their own files
CREATE POLICY "Authenticated users can update/delete their own files"
  ON storage.objects
  FOR UPDATE, DELETE
  TO authenticated
  USING (bucket_id = 'notes' AND auth.uid() = owner);

-- Allow anyone to select (download/view)
CREATE POLICY "Anyone can view files"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'notes');