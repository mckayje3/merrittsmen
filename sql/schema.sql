-- Merritt's Men Database Schema
-- Run this in Supabase SQL Editor

-- Enable UUID extension (usually already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Groups table (mentorship cohorts)
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    group_number INT NOT NULL,
    year INT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_number, year)
);

-- Members table (group members - may or may not have accounts)
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    group_id INT REFERENCES groups(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    position INT NOT NULL CHECK (position >= 1 AND position <= 8),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(group_id, position)
);

-- Profiles table (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    approved BOOLEAN DEFAULT FALSE,
    is_admin BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Books table
CREATE TABLE books (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    author TEXT NOT NULL,
    group_id INT REFERENCES groups(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Book reviews table (file uploads)
CREATE TABLE book_reviews (
    id SERIAL PRIMARY KEY,
    book_id INT REFERENCES books(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    file_url TEXT NOT NULL,
    file_name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Testimonials table
CREATE TABLE testimonials (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_members_group_id ON members(group_id);
CREATE INDEX idx_members_user_id ON members(user_id);
CREATE INDEX idx_books_group_id ON books(group_id);
CREATE INDEX idx_book_reviews_book_id ON book_reviews(book_id);
CREATE INDEX idx_book_reviews_user_id ON book_reviews(user_id);
CREATE INDEX idx_testimonials_user_id ON testimonials(user_id);
CREATE INDEX idx_profiles_approved ON profiles(approved);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE books ENABLE ROW LEVEL SECURITY;
ALTER TABLE book_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE testimonials ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is approved
CREATE OR REPLACE FUNCTION is_approved()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND approved = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_admin = TRUE AND approved = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

-- Approved users can view all profiles (for testimonial author names, etc.)
CREATE POLICY "Approved users can view all profiles"
    ON profiles FOR SELECT
    USING (is_approved());

-- Users can insert their own profile on signup
CREATE POLICY "Users can insert own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile (for approval)
CREATE POLICY "Admins can update profiles"
    ON profiles FOR UPDATE
    USING (is_admin());

-- ============================================
-- GROUPS POLICIES
-- ============================================

-- Approved users can view groups
CREATE POLICY "Approved users can view groups"
    ON groups FOR SELECT
    USING (is_approved());

-- Admins can manage groups
CREATE POLICY "Admins can insert groups"
    ON groups FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update groups"
    ON groups FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete groups"
    ON groups FOR DELETE
    USING (is_admin());

-- ============================================
-- MEMBERS POLICIES
-- ============================================

-- Approved users can view members
CREATE POLICY "Approved users can view members"
    ON members FOR SELECT
    USING (is_approved());

-- Admins can manage members
CREATE POLICY "Admins can insert members"
    ON members FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update members"
    ON members FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete members"
    ON members FOR DELETE
    USING (is_admin());

-- ============================================
-- BOOKS POLICIES
-- ============================================

-- Approved users can view books
CREATE POLICY "Approved users can view books"
    ON books FOR SELECT
    USING (is_approved());

-- Admins can manage books
CREATE POLICY "Admins can insert books"
    ON books FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "Admins can update books"
    ON books FOR UPDATE
    USING (is_admin());

CREATE POLICY "Admins can delete books"
    ON books FOR DELETE
    USING (is_admin());

-- ============================================
-- BOOK REVIEWS POLICIES
-- ============================================

-- Approved users can view all reviews
CREATE POLICY "Approved users can view reviews"
    ON book_reviews FOR SELECT
    USING (is_approved());

-- Approved users can insert their own reviews
CREATE POLICY "Approved users can insert own reviews"
    ON book_reviews FOR INSERT
    WITH CHECK (is_approved() AND auth.uid() = user_id);

-- Users can delete their own reviews, admins can delete any
CREATE POLICY "Users can delete own reviews"
    ON book_reviews FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- ============================================
-- TESTIMONIALS POLICIES
-- ============================================

-- Approved users can view all testimonials
CREATE POLICY "Approved users can view testimonials"
    ON testimonials FOR SELECT
    USING (is_approved());

-- Approved users can insert their own testimonials
CREATE POLICY "Approved users can insert own testimonials"
    ON testimonials FOR INSERT
    WITH CHECK (is_approved() AND auth.uid() = user_id);

-- Users can update their own testimonials
CREATE POLICY "Users can update own testimonials"
    ON testimonials FOR UPDATE
    USING (auth.uid() = user_id);

-- Users can delete their own testimonials, admins can delete any
CREATE POLICY "Users can delete own testimonials"
    ON testimonials FOR DELETE
    USING (auth.uid() = user_id OR is_admin());

-- ============================================
-- STORAGE BUCKET SETUP (run separately in Supabase Dashboard)
-- ============================================
-- 1. Create a bucket named "reviews"
-- 2. Make it private (not public)
-- 3. Add these storage policies:

-- Storage policy for viewing files (approved users)
-- CREATE POLICY "Approved users can view review files"
-- ON storage.objects FOR SELECT
-- USING (bucket_id = 'reviews' AND is_approved());

-- Storage policy for uploading files (approved users, own files)
-- CREATE POLICY "Approved users can upload review files"
-- ON storage.objects FOR INSERT
-- WITH CHECK (bucket_id = 'reviews' AND is_approved());

-- Storage policy for deleting files (own files or admin)
-- CREATE POLICY "Users can delete own review files"
-- ON storage.objects FOR DELETE
-- USING (bucket_id = 'reviews' AND (auth.uid()::text = (storage.foldername(name))[1] OR is_admin()));

-- ============================================
-- TRIGGER: Auto-create profile on signup
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, full_name, email, approved, is_admin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
        NEW.email,
        FALSE,
        FALSE
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- SAMPLE DATA (optional - remove in production)
-- ============================================

-- Uncomment to add sample data for testing:
/*
INSERT INTO groups (group_number, year) VALUES
    (1, 2015),
    (2, 2016),
    (3, 2017);

INSERT INTO members (group_id, name, position) VALUES
    (1, 'John Smith', 1),
    (1, 'Michael Johnson', 2),
    (1, 'David Williams', 3),
    (1, 'James Brown', 4),
    (1, 'Robert Davis', 5),
    (1, 'William Miller', 6),
    (1, 'Richard Wilson', 7),
    (1, 'Joseph Moore', 8);

INSERT INTO books (title, author, group_id) VALUES
    ('The 7 Habits of Highly Effective People', 'Stephen Covey', 1),
    ('How to Win Friends and Influence People', 'Dale Carnegie', 1),
    ('Man''s Search for Meaning', 'Viktor Frankl', 2);
*/
