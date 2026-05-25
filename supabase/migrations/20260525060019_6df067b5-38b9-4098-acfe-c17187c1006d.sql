
CREATE TABLE public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  to_email text NOT NULL,
  subject text NOT NULL,
  status text NOT NULL,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service role manages email_logs" ON public.email_logs
FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "owners read email_logs" ON public.email_logs
FOR SELECT USING (public.has_role(auth.uid(), 'owner'::app_role));

CREATE INDEX idx_email_logs_created_at ON public.email_logs (created_at DESC);
