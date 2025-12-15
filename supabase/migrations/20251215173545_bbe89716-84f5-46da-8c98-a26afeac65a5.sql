-- Create skills table (global skills catalog)
CREATE TABLE public.skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_name TEXT NOT NULL,
  name TEXT NOT NULL,
  validated BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_name, name)
);

-- Create user_skills table (user's skills with proficiency)
CREATE TABLE public.user_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_name TEXT NOT NULL,
  user_id TEXT NOT NULL,
  skill_id UUID NOT NULL REFERENCES public.skills(id) ON DELETE CASCADE,
  proficiency INTEGER NOT NULL CHECK (proficiency >= 1 AND proficiency <= 5),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_name, user_id, skill_id)
);

-- Create tenant_users table (stores user info received from platform)
CREATE TABLE public.tenant_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_name TEXT NOT NULL,
  user_name TEXT NOT NULL,
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(tenant_name, user_name)
);

-- Enable Row Level Security
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_users ENABLE ROW LEVEL SECURITY;

-- RLS Policies for skills (public read within tenant, authenticated write)
CREATE POLICY "Anyone can view skills"
ON public.skills FOR SELECT
USING (true);

CREATE POLICY "Anyone can insert skills"
ON public.skills FOR INSERT
WITH CHECK (true);

-- RLS Policies for user_skills
CREATE POLICY "Anyone can view user skills"
ON public.user_skills FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage user skills"
ON public.user_skills FOR ALL
USING (true);

-- RLS Policies for tenant_users
CREATE POLICY "Anyone can view tenant users"
ON public.tenant_users FOR SELECT
USING (true);

CREATE POLICY "Anyone can manage tenant users"
ON public.tenant_users FOR ALL
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_skills_updated_at
BEFORE UPDATE ON public.skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_skills_updated_at
BEFORE UPDATE ON public.user_skills
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tenant_users_updated_at
BEFORE UPDATE ON public.tenant_users
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();