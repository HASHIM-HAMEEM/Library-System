-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.admin_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  invite_code character varying NOT NULL UNIQUE,
  email character varying NOT NULL,
  name character varying NOT NULL,
  created_by uuid,
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'used'::character varying, 'expired'::character varying]::text[])),
  expires_at timestamp with time zone NOT NULL,
  used_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_invites_pkey PRIMARY KEY (id),
  CONSTRAINT admin_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.admin_meta (
  user_id uuid NOT NULL,
  full_name text NOT NULL,
  last_login timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT admin_meta_pkey PRIMARY KEY (user_id)
);
CREATE TABLE public.attendance_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  entry_time timestamp with time zone NOT NULL,
  exit_time timestamp with time zone,
  duration integer,
  scanned_by_admin_id uuid,
  entry_method character varying DEFAULT 'qr_scan'::character varying CHECK (entry_method::text = ANY (ARRAY['qr_scan'::character varying, 'manual'::character varying, 'auto_exit'::character varying]::text[])),
  is_synced boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT attendance_logs_pkey PRIMARY KEY (id),
  CONSTRAINT attendance_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT attendance_logs_scanned_by_admin_id_fkey FOREIGN KEY (scanned_by_admin_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.library_users (
  id uuid NOT NULL,
  full_name text NOT NULL,
  subscription_valid_until date,
  qr_code text UNIQUE,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT library_users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.qr_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  qr_data jsonb NOT NULL,
  qr_code_url text,
  encrypted_data text,
  is_active boolean DEFAULT true,
  expires_at timestamp with time zone,
  generated_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_codes_pkey PRIMARY KEY (id),
  CONSTRAINT qr_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT qr_codes_generated_by_fkey FOREIGN KEY (generated_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.qr_scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  student_id uuid,
  admin_id uuid,
  scan_timestamp timestamp with time zone DEFAULT now(),
  scan_result character varying CHECK (scan_result::text = ANY (ARRAY['success'::character varying, 'expired_subscription'::character varying, 'invalid_token'::character varying, 'expired_token'::character varying]::text[])),
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_scan_logs_pkey PRIMARY KEY (id),
  CONSTRAINT qr_scan_logs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.user_profiles(id),
  CONSTRAINT qr_scan_logs_admin_id_fkey FOREIGN KEY (admin_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.scan_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  entry_time timestamp with time zone,
  exit_time timestamp with time zone,
  duration interval DEFAULT (exit_time - entry_time),
  verified_by uuid,
  status text DEFAULT 'entry'::text CHECK (status = ANY (ARRAY['entry'::text, 'exit'::text, 'invalid'::text, 'expired'::text])),
  scan_type text DEFAULT 'entry'::text CHECK (scan_type = ANY (ARRAY['entry'::text, 'exit'::text])),
  location text DEFAULT 'main_entrance'::text,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  scanned_at timestamp with time zone DEFAULT now(),
  CONSTRAINT scan_logs_pkey PRIMARY KEY (id),
  CONSTRAINT scan_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT scan_logs_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.subscription_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  subscription_type text NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  renewed_by uuid,
  payment_status text DEFAULT 'pending'::text,
  amount numeric,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscription_history_pkey PRIMARY KEY (id),
  CONSTRAINT subscription_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT subscription_history_renewed_by_fkey FOREIGN KEY (renewed_by) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  plan_type character varying NOT NULL CHECK (plan_type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying]::text[])),
  amount numeric NOT NULL,
  start_date timestamp with time zone NOT NULL,
  end_date timestamp with time zone NOT NULL,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'expired'::character varying, 'cancelled'::character varying]::text[])),
  payment_method character varying,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  name character varying NOT NULL,
  email character varying NOT NULL UNIQUE,
  phone character varying,
  address text,
  role character varying DEFAULT 'student'::character varying CHECK (role::text = ANY (ARRAY['student'::character varying, 'admin'::character varying]::text[])),
  status character varying DEFAULT 'pending'::character varying CHECK (status::text = ANY (ARRAY['pending'::character varying, 'verified'::character varying, 'rejected'::character varying]::text[])),
  rejection_reason text,
  profile_picture_url text,
  id_proof_url text,
  subscription_status character varying DEFAULT 'inactive'::character varying CHECK (subscription_status::text = ANY (ARRAY['active'::character varying, 'expired'::character varying, 'inactive'::character varying]::text[])),
  subscription_type character varying CHECK (subscription_type::text = ANY (ARRAY['daily'::character varying, 'weekly'::character varying, 'monthly'::character varying]::text[])),
  subscription_start timestamp with time zone,
  subscription_end timestamp with time zone,
  qr_token character varying UNIQUE,
  qr_token_expires_at timestamp with time zone,
  last_qr_generated_at timestamp with time zone,
  is_active boolean DEFAULT true,
  verified_at timestamp with time zone,
  verified_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  institution_id text,
  profile_pic_url text,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id),
  CONSTRAINT user_profiles_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES public.user_profiles(id)
);