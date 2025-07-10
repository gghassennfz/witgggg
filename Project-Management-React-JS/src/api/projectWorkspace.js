// Project Workspace Backend API (per project)
import { supabase } from '../supabaseClient';

const WORKSPACE_TABLE = 'project_workspace';
const TASKS_TABLE = 'project_tasks';

// Fetch the workspace row for a project
export async function getProjectWorkspace(project_id) {
  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .select('*')
    .eq('project_id', project_id)
    .single();
  if (error) throw error;
  return data;
}

// Create a new workspace row for a project (if not exists)
export async function createProjectWorkspace(project_id) {
  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .insert([
      { project_id, activity: [], calendar_events: [], files: [] }
    ])
    .single();
  if (error) throw error;
  return data;
}

// Update the entire workspace row (all fields)
export async function updateProjectWorkspace(project_id, workspaceObj) {
  const { data, error } = await supabase
    .from(WORKSPACE_TABLE)
    .update({ ...workspaceObj, updated_at: new Date().toISOString() })
    .eq('project_id', project_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// --- TASKS ---

// Get all tasks for a project
export async function getProjectTasks(project_id) {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .select('*')
    .eq('project_id', project_id)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

// Add a new task to a project
export async function addProjectTask(project_id, assigned_to, text, priority = 'Medium') {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .insert([
      { project_id, assigned_to, text, priority }
    ])
    .single();
  if (error) throw error;
  return data;
}

// Update a task
export async function updateProjectTask(task_id, updates) {
  const { data, error } = await supabase
    .from(TASKS_TABLE)
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', task_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Delete a task
export async function deleteProjectTask(task_id) {
  const { error } = await supabase
    .from(TASKS_TABLE)
    .delete()
    .eq('id', task_id);
  if (error) throw error;
  return true;
}
