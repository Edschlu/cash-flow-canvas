-- Create profiles table for user data
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create projects table
CREATE TABLE public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Projects policies
CREATE POLICY "Users can view their own projects"
  ON public.projects FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own projects"
  ON public.projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
  ON public.projects FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
  ON public.projects FOR DELETE
  USING (auth.uid() = user_id);

-- Create business_cases table with types
CREATE TYPE public.business_case_type AS ENUM ('saas', 'marketplace', 'ecommerce', 'ai', 'service', 'custom');
CREATE TYPE public.business_case_status AS ENUM ('draft', 'active', 'archived');

CREATE TABLE public.business_cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type public.business_case_type NOT NULL DEFAULT 'custom',
  description TEXT,
  status public.business_case_status NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on business_cases
ALTER TABLE public.business_cases ENABLE ROW LEVEL SECURITY;

-- Business cases policies
CREATE POLICY "Users can view business cases of their projects"
  ON public.business_cases FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = business_cases.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create business cases in their projects"
  ON public.business_cases FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = business_cases.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update business cases in their projects"
  ON public.business_cases FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = business_cases.project_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete business cases in their projects"
  ON public.business_cases FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.projects
    WHERE projects.id = business_cases.project_id
    AND projects.user_id = auth.uid()
  ));

-- Create cash_plans table
CREATE TABLE public.cash_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_case_id UUID NOT NULL REFERENCES public.business_cases(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'EUR',
  start_month DATE NOT NULL DEFAULT DATE_TRUNC('month', NOW()),
  months INTEGER NOT NULL DEFAULT 24,
  initial_cash DECIMAL(15, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on cash_plans
ALTER TABLE public.cash_plans ENABLE ROW LEVEL SECURITY;

-- Cash plans policies
CREATE POLICY "Users can view cash plans of their business cases"
  ON public.cash_plans FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.business_cases
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE business_cases.id = cash_plans.business_case_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create cash plans in their business cases"
  ON public.cash_plans FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.business_cases
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE business_cases.id = cash_plans.business_case_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update cash plans in their business cases"
  ON public.cash_plans FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.business_cases
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE business_cases.id = cash_plans.business_case_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete cash plans in their business cases"
  ON public.cash_plans FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.business_cases
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE business_cases.id = cash_plans.business_case_id
    AND projects.user_id = auth.uid()
  ));

-- Create cash_plan_rows table
CREATE TYPE public.cash_row_category AS ENUM ('revenue', 'cost', 'headcount', 'other');

CREATE TABLE public.cash_plan_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_plan_id UUID NOT NULL REFERENCES public.cash_plans(id) ON DELETE CASCADE,
  category public.cash_row_category NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  monthly_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on cash_plan_rows
ALTER TABLE public.cash_plan_rows ENABLE ROW LEVEL SECURITY;

-- Cash plan rows policies
CREATE POLICY "Users can view cash plan rows"
  ON public.cash_plan_rows FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.cash_plans
    JOIN public.business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = cash_plan_rows.cash_plan_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can create cash plan rows"
  ON public.cash_plan_rows FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.cash_plans
    JOIN public.business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = cash_plan_rows.cash_plan_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can update cash plan rows"
  ON public.cash_plan_rows FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.cash_plans
    JOIN public.business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = cash_plan_rows.cash_plan_id
    AND projects.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete cash plan rows"
  ON public.cash_plan_rows FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.cash_plans
    JOIN public.business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN public.projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = cash_plan_rows.cash_plan_id
    AND projects.user_id = auth.uid()
  ));

-- Create trigger function for updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_business_cases_updated_at
  BEFORE UPDATE ON public.business_cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_plans_updated_at
  BEFORE UPDATE ON public.cash_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_plan_rows_updated_at
  BEFORE UPDATE ON public.cash_plan_rows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_projects_user_id ON public.projects(user_id);
CREATE INDEX idx_business_cases_project_id ON public.business_cases(project_id);
CREATE INDEX idx_cash_plans_business_case_id ON public.cash_plans(business_case_id);
CREATE INDEX idx_cash_plan_rows_cash_plan_id ON public.cash_plan_rows(cash_plan_id);
CREATE INDEX idx_cash_plan_rows_sort_order ON public.cash_plan_rows(cash_plan_id, sort_order);