CREATE DATABASE IF NOT EXISTS wanderease
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE wanderease;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role ENUM('user','admin') NOT NULL DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS destinations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  location VARCHAR(150) NOT NULL,
  category VARCHAR(80) NOT NULL,
  image TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(180) NOT NULL,
  destination VARCHAR(150) NOT NULL,
  duration VARCHAR(80) NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  image TEXT,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  package_id INT NOT NULL,
  travel_date DATE NOT NULL,
  travelers INT NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  status ENUM('Confirmed','Cancelled') NOT NULL DEFAULT 'Confirmed',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_booking_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_booking_package
    FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reviews (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_review_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS enquiries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL,
  subject VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Demo admin account:
-- Email: admin@tourism.com
-- Password: admin123
-- bcrypt hash below is for admin123
INSERT INTO users (name, email, password, role)
VALUES (
  'WanderEase Admin',
  'admin@tourism.com',
  '$2a$10$eImiTXuWVx6Ih9nM6Y0nM.6hJ4uR8k6F3fQv7gZ5q4rVh9zP3e3mS',
  'admin'
)
ON DUPLICATE KEY UPDATE email=email;

INSERT INTO destinations (name, location, category, image, description)
SELECT 'Taj Mahal', 'Agra, India', 'Heritage',
'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=900&q=80',
'Iconic monument and a must-visit heritage destination.'
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name='Taj Mahal');

INSERT INTO destinations (name, location, category, image, description)
SELECT 'Goa Beaches', 'Goa, India', 'Beach',
'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80',
'Relax on beautiful beaches and enjoy coastal experiences.'
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name='Goa Beaches');

INSERT INTO destinations (name, location, category, image, description)
SELECT 'Manali', 'Himachal Pradesh, India', 'Mountain',
'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
'Mountain scenery, adventure activities and peaceful escapes.'
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name='Manali');

INSERT INTO destinations (name, location, category, image, description)
SELECT 'Jaipur', 'Rajasthan, India', 'Culture',
'https://images.unsplash.com/photo-1477587458883-47145ed94245?auto=format&fit=crop&w=900&q=80',
'Explore forts, palaces, markets and Rajasthan culture.'
WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE name='Jaipur');

INSERT INTO packages (title, destination, duration, price, image, description)
SELECT 'Golden Triangle Explorer', 'Delhi - Agra - Jaipur', '5 Days / 4 Nights', 24999,
'https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=900&q=80',
'Heritage-focused trip covering three iconic North Indian destinations.'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title='Golden Triangle Explorer');

INSERT INTO packages (title, destination, duration, price, image, description)
SELECT 'Goa Beach Escape', 'Goa', '4 Days / 3 Nights', 18999,
'https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=900&q=80',
'Beach holiday with leisure time and local sightseeing.'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title='Goa Beach Escape');

INSERT INTO packages (title, destination, duration, price, image, description)
SELECT 'Manali Adventure', 'Manali', '5 Days / 4 Nights', 21999,
'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=900&q=80',
'Mountain getaway with sightseeing and adventure activities.'
WHERE NOT EXISTS (SELECT 1 FROM packages WHERE title='Manali Adventure');
