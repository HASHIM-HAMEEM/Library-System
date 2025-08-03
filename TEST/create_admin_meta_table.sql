-- Create admin_meta table
CREATE TABLE IF NOT EXISTS public.admin_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'admin',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_meta_user_id ON admin_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_meta_role ON admin_meta(role);

-- Enable Row Level Security (RLS)
ALTER TABLE admin_meta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for admin_meta
-- Admins can view their own metadata
CREATE POLICY "Admins can view their own metadata"
ON public.admin_meta
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can update their own metadata
CREATE POLICY "Admins can update their own metadata"
ON public.admin_meta
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admin metadata creation
CREATE POLICY "Allow admin metadata creation"
ON public.admin_meta
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE admin_meta TO anon, authenticated;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE admin_meta;

COMMENT ON TABLE admin_meta IS 'Admin user metadata and permissions';

-- Insert admin metadata for the existing admin user
INSERT INTO public.admin_meta (user_id, role, permissions)
VALUES (
  'a36be38b-b174-46c5-bf9d-f4cf5993ac94',
  'admin',
  '{"dashboard_access": true, "user_management": true, "system_settings": true}'
) ON CONFLICT (user_id) DO NOTHING;

SELECT 'admin_meta table created successfully!' as result;