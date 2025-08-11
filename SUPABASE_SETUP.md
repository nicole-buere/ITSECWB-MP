# Supabase Setup Guide

## Prerequisites
1. A Supabase account and project
2. Node.js and npm installed

## Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a `.env` file in the root directory with the following variables:

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url_here
SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Server Configuration
PORT=3000
SESSION_SECRET=apdev123
```

### 3. Get Supabase Credentials
1. Go to your Supabase project dashboard
2. Navigate to Settings > API
3. Copy the "Project URL" and "anon public" key
4. Paste them in your `.env` file

### 4. Database Schema
Your Supabase database should have the following tables:

#### users table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'student',
  description TEXT DEFAULT '',
  profilePicture TEXT DEFAULT 'https://www.redditstatic.com/avatars/avatar_default_02_4856A3.png',
  reservations JSONB DEFAULT '[]',
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### labs table
```sql
CREATE TABLE labs (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  seats JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### reservation table
```sql
CREATE TABLE reservation (
  id SERIAL PRIMARY KEY,
  lab_id VARCHAR(255) NOT NULL,
  seatNumber INTEGER NOT NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  reserved_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 5. Run the Application
```bash
npm start
```

## Notes
- The application now uses Supabase instead of MongoDB
- All database operations have been updated to use Supabase's query builder
- Make sure your Supabase project has Row Level Security (RLS) policies configured appropriately
- The application will automatically test the connection to Supabase on startup
