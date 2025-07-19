-- WitG Projects Feature - Clean Setup
-- Run this SQL in your Supabase SQL Editor to clean up old tables and create new ones

-- Step 1: Drop old project-related tables (if they exist)
DROP TABLE IF EXISTS public.project_files CASCADE;
DROP TABLE IF EXISTS public.project_activity_logs CASCADE;
DROP TABLE IF EXISTS public.project_calendar_events CASCADE;
DROP TABLE IF EXISTS public.project_tasks CASCADE;
DROP TABLE IF EXISTS public.project_members CASCADE;
DROP TABLE IF EXISTS public.projects CASCADE;

-- Step 2: Create new projects table with correct schema
CREATE TABLE projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    created_by UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    color VARCHAR(7) DEFAULT '#007bff',
    due_date TIMESTAMP WITH TIME ZONE,
    github_repo TEXT,
    design_files JSONB DEFAULT '[]'::jsonb,
    resources JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create project_members table
CREATE TABLE project_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(project_id, user_id)
);

-- Step 4: Create project_tasks table
CREATE TABLE project_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_to UUID REFERENCES auth.users(id),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    status VARCHAR(50) DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'completed')),
    priority VARCHAR(50) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
    due_date TIMESTAMP WITH TIME ZONE,
    tags JSONB DEFAULT '[]'::jsonb,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 5: Create project_calendar_events table
CREATE TABLE project_calendar_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    event_type VARCHAR(50) DEFAULT 'meeting' CHECK (event_type IN ('meeting', 'deadline', 'milestone', 'reminder')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    attendees JSONB DEFAULT '[]'::jsonb,
    location TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 6: Create project_activity_logs table
CREATE TABLE project_activity_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 7: Create project_files table
CREATE TABLE project_files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id),
    description TEXT,
    tags JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 8: Create indexes for better performance
CREATE INDEX idx_projects_group_id ON projects(group_id);
CREATE INDEX idx_projects_created_by ON projects(created_by);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_project_tasks_project_id ON project_tasks(project_id);
CREATE INDEX idx_project_tasks_assigned_to ON project_tasks(assigned_to);
CREATE INDEX idx_project_calendar_events_project_id ON project_calendar_events(project_id);
CREATE INDEX idx_project_activity_logs_project_id ON project_activity_logs(project_id);
CREATE INDEX idx_project_files_project_id ON project_files(project_id);

-- Step 9: Enable Row Level Security (RLS)
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;

-- Step 10: Create RLS Policies for projects table
CREATE POLICY "Users can view projects in their groups" ON projects
    FOR SELECT USING (
        group_id IN (
            SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
            WHERE (member->>'user_id')::uuid = auth.uid()
            AND member->>'status' = 'accepted'
        )
    );

CREATE POLICY "Users can create projects in their groups" ON projects
    FOR INSERT WITH CHECK (
        group_id IN (
            SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
            WHERE (member->>'user_id')::uuid = auth.uid()
            AND member->>'status' = 'accepted'
        )
    );

CREATE POLICY "Users can update projects in their groups" ON projects
    FOR UPDATE USING (
        group_id IN (
            SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
            WHERE (member->>'user_id')::uuid = auth.uid()
            AND member->>'status' = 'accepted'
        )
    );

CREATE POLICY "Users can delete their own projects" ON projects
    FOR DELETE USING (created_by = auth.uid());

-- Step 11: Create RLS Policies for project_members table
CREATE POLICY "Users can view project members" ON project_members
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage project members" ON project_members
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

-- Step 12: Create RLS Policies for project_tasks table
CREATE POLICY "Users can view project tasks" ON project_tasks
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage project tasks" ON project_tasks
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

-- Step 13: Create RLS Policies for project_calendar_events table
CREATE POLICY "Users can view project calendar events" ON project_calendar_events
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage project calendar events" ON project_calendar_events
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

-- Step 14: Create RLS Policies for project_activity_logs table
CREATE POLICY "Users can view project activity logs" ON project_activity_logs
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

CREATE POLICY "Users can create project activity logs" ON project_activity_logs
    FOR INSERT WITH CHECK (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

-- Step 15: Create RLS Policies for project_files table
CREATE POLICY "Users can view project files" ON project_files
    FOR SELECT USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

CREATE POLICY "Users can manage project files" ON project_files
    FOR ALL USING (
        project_id IN (
            SELECT p.id FROM projects p
            WHERE p.group_id IN (
                SELECT g.id FROM groups g, jsonb_array_elements(g.members) AS member
                WHERE (member->>'user_id')::uuid = auth.uid()
                AND member->>'status' = 'accepted'
            )
        )
    );

-- Step 16: Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_tasks_updated_at BEFORE UPDATE ON project_tasks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_calendar_events_updated_at BEFORE UPDATE ON project_calendar_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_files_updated_at BEFORE UPDATE ON project_files
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
SELECT 'WitG Projects Feature database setup completed successfully!' as message;
