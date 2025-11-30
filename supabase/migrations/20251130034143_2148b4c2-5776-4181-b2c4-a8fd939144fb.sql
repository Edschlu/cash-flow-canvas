-- Create memos table for business strategy documents
CREATE TABLE public.memos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_case_id UUID NOT NULL REFERENCES public.business_cases(id) ON DELETE CASCADE,
  problem TEXT DEFAULT '',
  solution TEXT DEFAULT '',
  market TEXT DEFAULT '',
  competition TEXT DEFAULT '',
  gtm TEXT DEFAULT '',
  finances TEXT DEFAULT '',
  risks TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.memos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for memos
CREATE POLICY "Users can view memos of their business cases"
  ON public.memos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM business_cases
      JOIN projects ON projects.id = business_cases.project_id
      WHERE business_cases.id = memos.business_case_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create memos in their business cases"
  ON public.memos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM business_cases
      JOIN projects ON projects.id = business_cases.project_id
      WHERE business_cases.id = memos.business_case_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update memos in their business cases"
  ON public.memos
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM business_cases
      JOIN projects ON projects.id = business_cases.project_id
      WHERE business_cases.id = memos.business_case_id
        AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete memos in their business cases"
  ON public.memos
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM business_cases
      JOIN projects ON projects.id = business_cases.project_id
      WHERE business_cases.id = memos.business_case_id
        AND projects.user_id = auth.uid()
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_memos_updated_at
  BEFORE UPDATE ON public.memos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();