-- ============================================================
-- ValueDam Network - Batch 2 Incremental Migration
-- Builds on the existing Batch 1 database.
-- DO NOT drop or recreate Batch 1 functions/tables.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Make sure admin_profiles has the fields Batch 2 needs
-- ------------------------------------------------------------

ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS full_name text;

ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'admin';

ALTER TABLE public.admin_profiles
ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;


-- ------------------------------------------------------------
-- 2. Homepage editor additions
-- ------------------------------------------------------------

ALTER TABLE public.homepage_content
ADD COLUMN IF NOT EXISTS hero_image_url text;

ALTER TABLE public.homepage_content
ADD COLUMN IF NOT EXISTS hero_badge text;

ALTER TABLE public.homepage_content
ADD COLUMN IF NOT EXISTS about_image_url text;

ALTER TABLE public.homepage_content
ADD COLUMN IF NOT EXISTS cta_button_text text;

ALTER TABLE public.homepage_content
ADD COLUMN IF NOT EXISTS cta_button_url text;


-- ------------------------------------------------------------
-- 3. Site settings additions
-- ------------------------------------------------------------

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS facebook_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS instagram_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS twitter_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS linkedin_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS marketplace_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS social_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS vtu_url text;

ALTER TABLE public.site_settings
ADD COLUMN IF NOT EXISTS favicon_url text;


-- ------------------------------------------------------------
-- 4. Portfolio additions
-- ------------------------------------------------------------

ALTER TABLE public.portfolio_projects
ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.portfolio_projects
ADD COLUMN IF NOT EXISTS client_name text;


-- ------------------------------------------------------------
-- 5. Services additions
-- ------------------------------------------------------------

ALTER TABLE public.services
ADD COLUMN IF NOT EXISTS short_description text;


-- ------------------------------------------------------------
-- 6. Create admin audit/activity table
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_activity (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    action text NOT NULL,
    entity_type text,
    entity_id uuid,
    description text,
    created_at timestamptz NOT NULL DEFAULT now()
);


-- ------------------------------------------------------------
-- 7. Enable RLS on the new table
-- ------------------------------------------------------------

ALTER TABLE public.admin_activity ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------
-- 8. Admin activity policy
-- Uses the EXISTING Batch 1 is_admin() function.
-- ------------------------------------------------------------

DROP POLICY IF EXISTS "admin activity access"
ON public.admin_activity;

CREATE POLICY "admin activity access"
ON public.admin_activity
FOR ALL
TO authenticated
USING (public.is_admin())
WITH CHECK (public.is_admin());


-- ------------------------------------------------------------
-- 9. Make sure existing tables remain protected for admins
-- ------------------------------------------------------------

-- These policies use the existing is_admin() function.
-- We only create them if they don't already exist.

DO $$
BEGIN

    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'site_settings'
          AND policyname = 'admin site settings access'
    ) THEN
        CREATE POLICY "admin site settings access"
        ON public.site_settings
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'homepage_content'
          AND policyname = 'admin homepage content access'
    ) THEN
        CREATE POLICY "admin homepage content access"
        ON public.homepage_content
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'services'
          AND policyname = 'admin services access'
    ) THEN
        CREATE POLICY "admin services access"
        ON public.services
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'portfolio_projects'
          AND policyname = 'admin portfolio access'
    ) THEN
        CREATE POLICY "admin portfolio access"
        ON public.portfolio_projects
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;


    IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'testimonials'
          AND policyname = 'admin testimonials access'
    ) THEN
        CREATE POLICY "admin testimonials access"
        ON public.testimonials
        FOR ALL
        TO authenticated
        USING (public.is_admin())
        WITH CHECK (public.is_admin());
    END IF;

END $$;


-- ------------------------------------------------------------
-- 10. Create/update a default site settings record
-- ------------------------------------------------------------

INSERT INTO public.site_settings (
    site_name,
    tagline
)
SELECT
    'ValueDam Network',
    'You have a business task. We help you get it done.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.site_settings
);


-- ------------------------------------------------------------
-- 11. Create/update homepage record if none exists
-- ------------------------------------------------------------

INSERT INTO public.homepage_content (
    hero_title,
    hero_text,
    hero_button,
    about_title,
    about_text,
    cta_title,
    cta_text
)
SELECT
    'Your Business. Our Support.',
    'You have a business task. We help you get it done.',
    'Request a Service',
    'Helping Businesses Get Things Done',
    'ValueDam Network provides practical digital, business and support services for individuals and businesses.',
    'Ready to Get Started?',
    'Tell us what you need and let us help you get it done.'
WHERE NOT EXISTS (
    SELECT 1 FROM public.homepage_content
);


-- ------------------------------------------------------------
-- DONE
-- ------------------------------------------------------------