-- Create scenarios table for forecasting
CREATE TABLE IF NOT EXISTS public.scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_plan_id UUID NOT NULL REFERENCES public.cash_plans(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('base', 'best', 'worst', 'custom')),
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create scenario_rows table to store calculated values
CREATE TABLE IF NOT EXISTS public.scenario_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.scenarios(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('revenue', 'cost', 'headcount', 'other')),
  name TEXT NOT NULL,
  monthly_values JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scenario_rows ENABLE ROW LEVEL SECURITY;

-- RLS Policies for scenarios
CREATE POLICY "Users can view scenarios of their cash plans"
ON public.scenarios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM cash_plans
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = scenarios.cash_plan_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create scenarios in their cash plans"
ON public.scenarios
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM cash_plans
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = scenarios.cash_plan_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update scenarios in their cash plans"
ON public.scenarios
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM cash_plans
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = scenarios.cash_plan_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scenarios in their cash plans"
ON public.scenarios
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM cash_plans
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE cash_plans.id = scenarios.cash_plan_id
    AND projects.user_id = auth.uid()
  )
);

-- RLS Policies for scenario_rows
CREATE POLICY "Users can view scenario rows"
ON public.scenario_rows
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN cash_plans ON cash_plans.id = scenarios.cash_plan_id
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE scenarios.id = scenario_rows.scenario_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create scenario rows"
ON public.scenario_rows
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN cash_plans ON cash_plans.id = scenarios.cash_plan_id
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE scenarios.id = scenario_rows.scenario_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update scenario rows"
ON public.scenario_rows
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN cash_plans ON cash_plans.id = scenarios.cash_plan_id
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE scenarios.id = scenario_rows.scenario_id
    AND projects.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete scenario rows"
ON public.scenario_rows
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM scenarios
    JOIN cash_plans ON cash_plans.id = scenarios.cash_plan_id
    JOIN business_cases ON business_cases.id = cash_plans.business_case_id
    JOIN projects ON projects.id = business_cases.project_id
    WHERE scenarios.id = scenario_rows.scenario_id
    AND projects.user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_scenarios_updated_at
BEFORE UPDATE ON public.scenarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scenario_rows_updated_at
BEFORE UPDATE ON public.scenario_rows
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX scenarios_cash_plan_id_idx ON public.scenarios(cash_plan_id);
CREATE INDEX scenario_rows_scenario_id_idx ON public.scenario_rows(scenario_id);