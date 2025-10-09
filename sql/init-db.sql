-- Create replication role if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'dbz') THEN
      CREATE ROLE dbz WITH REPLICATION LOGIN PASSWORD 'dbz';
   END IF;
END
$$;

-- Create database if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = 'mv100db') THEN
      CREATE DATABASE mv100db;
   END IF;
END
$$;

\connect mv100db

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- Products table with image_url
CREATE TABLE IF NOT EXISTS public.products (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC(10,2) NOT NULL,
  image_url TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Orders table
CREATE TABLE IF NOT EXISTS public.orders (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES public.users(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_intent TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Payments table with payment_intent
CREATE TABLE IF NOT EXISTS public.payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id),
  amount NUMERIC(10,2),
  status VARCHAR(50),
  provider VARCHAR(50),
  payment_intent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Emails table
CREATE TABLE IF NOT EXISTS public.emails (
  id SERIAL PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  sent_at TIMESTAMP NULL
);

-- Create publication if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'dbz_pub') THEN
      CREATE PUBLICATION dbz_pub 
      FOR TABLE public.users, public.orders, public.payments, public.emails, public.products;
   END IF;
END
$$;

-- Grant privileges to dbz user
GRANT CONNECT ON DATABASE mv100db TO dbz;
GRANT USAGE ON SCHEMA public TO dbz;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO dbz;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO dbz;

-- Create application user if not exists
DO
$$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'appuser') THEN
      CREATE ROLE appuser WITH LOGIN PASSWORD 'appuser';
   END IF;
END
$$;

-- Grant privileges for appuser
GRANT CONNECT ON DATABASE mv100db TO appuser;
GRANT USAGE ON SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO appuser;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO appuser;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO appuser;
