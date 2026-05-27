
-- جدول السجلات العامة (Data API) — كل صف ينتمي إلى workspace ومجموعة (collection)
CREATE TABLE public.hn_data_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.hn_workspaces(id) ON DELETE CASCADE,
  collection text NOT NULL CHECK (collection ~ '^[a-z][a-z0-9_]{0,62}$'),
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_hn_data_records_ws_col ON public.hn_data_records(workspace_id, collection, created_at DESC);
CREATE INDEX idx_hn_data_records_data ON public.hn_data_records USING GIN (data);

GRANT SELECT ON public.hn_data_records TO authenticated;
GRANT ALL ON public.hn_data_records TO service_role;

ALTER TABLE public.hn_data_records ENABLE ROW LEVEL SECURITY;

-- المالك (عبر hn_users.auth_user_id ↔ workspace) يمكنه القراءة فقط من اللوحة.
-- جميع عمليات الكتابة تمر عبر API key وتستخدم service_role من الخادم.
CREATE POLICY "owners read their workspace data"
  ON public.hn_data_records FOR SELECT
  TO authenticated
  USING (
    workspace_id IN (
      SELECT w.id FROM public.hn_workspaces w
      JOIN public.hn_users u ON u.id = w.hn_user_id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "service role manages hn_data_records"
  ON public.hn_data_records FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- trigger لتحديث updated_at
CREATE TRIGGER trg_hn_data_records_updated_at
  BEFORE UPDATE ON public.hn_data_records
  FOR EACH ROW EXECUTE FUNCTION public.update_hn_users_updated_at();
