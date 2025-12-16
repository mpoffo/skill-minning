-- Create batch_jobs table to track background processing
CREATE TABLE public.batch_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, paused, completed, cancelled, error
  total_collaborators INTEGER DEFAULT 0,
  processed_collaborators INTEGER DEFAULT 0,
  current_batch INTEGER DEFAULT 0,
  total_batches INTEGER DEFAULT 0,
  skills_extracted INTEGER DEFAULT 0,
  skills_created INTEGER DEFAULT 0,
  users_created INTEGER DEFAULT 0,
  errors INTEGER DEFAULT 0,
  logs JSONB DEFAULT '[]'::jsonb,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.batch_jobs ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (this is an internal tool)
CREATE POLICY "Allow all operations on batch_jobs" 
ON public.batch_jobs 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_batch_jobs_updated_at
BEFORE UPDATE ON public.batch_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for batch_jobs
ALTER PUBLICATION supabase_realtime ADD TABLE public.batch_jobs;