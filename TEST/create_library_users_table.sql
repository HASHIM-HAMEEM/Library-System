-- Create library_users table
CREATE TABLE IF NOT EXISTS public.library_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  subscription_valid_until DATE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_library_users_qr_code ON library_users(qr_code);
CREATE INDEX IF NOT EXISTS idx_library_users_subscription ON library_users(subscription_valid_until);

-- Enable Row Level Security (RLS)
ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library_users
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.library_users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.library_users
FOR UPDATE
USING (auth.uid() = id);

-- Allow profile creation during signup
CREATE POLICY "Allow library user creation"
ON public.library_users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE library_users TO anon, authenticated;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE library_users;

COMMENT ON TABLE library_users IS 'Simplified user metadata for cross-platform library management';

SELECT 'library_users table created successfully!' as result;