-- Fix project_tasks table schema
-- Drop and recreate with correct column names

DROP TABLE IF EXISTS public.project_tasks CASCADE;

CREATE TABLE public.project_tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  title character varying(255) NOT NULL,
  description text NULL,
  assigned_to uuid NULL,
  created_by uuid NOT NULL,
  status character varying(50) NULL DEFAULT 'todo'::character varying,
  priority character varying(50) NULL DEFAULT 'medium'::character varying,
  due_date timestamp with time zone NULL,
  position integer NULL DEFAULT 0,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT project_tasks_pkey PRIMARY KEY (id),
  CONSTRAINT project_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES auth.users (id),
  CONSTRAINT project_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id),
  CONSTRAINT project_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects (id) ON DELETE CASCADE,
  CONSTRAINT project_tasks_priority_check CHECK (
    (priority)::text = ANY (
      ARRAY[
        'low'::character varying,
        'medium'::character varying,
        'high'::character varying
      ]::text[]
    )
  ),
  CONSTRAINT project_tasks_status_check CHECK (
    (status)::text = ANY (
      ARRAY[
        'todo'::character varying,
        'in_progress'::character varying,
        'done'::character varying
      ]::text[]
    )
  )
) TABLESPACE pg_default;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_project_tasks_project_id ON public.project_tasks USING btree (project_id) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_project_tasks_assigned_to ON public.project_tasks USING btree (assigned_to) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_project_tasks_created_by ON public.project_tasks USING btree (created_by) TABLESPACE pg_default;

-- Create trigger for updated_at
CREATE TRIGGER update_project_tasks_updated_at 
  BEFORE UPDATE ON project_tasks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.project_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view tasks in their group projects" ON public.project_tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN group_members gm ON p.group_id = gm.group_id
      WHERE p.id = project_tasks.project_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create tasks in their group projects" ON public.project_tasks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN group_members gm ON p.group_id = gm.group_id
      WHERE p.id = project_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update tasks in their group projects" ON public.project_tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN group_members gm ON p.group_id = gm.group_id
      WHERE p.id = project_tasks.project_id 
      AND gm.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete tasks in their group projects" ON public.project_tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM projects p
      JOIN group_members gm ON p.group_id = gm.group_id
      WHERE p.id = project_tasks.project_id 
      AND gm.user_id = auth.uid()
    )
  );
