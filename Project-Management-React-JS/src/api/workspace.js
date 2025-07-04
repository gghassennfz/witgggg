// Supabase Workspace Backend API (single row per user, JSON arrays for all workspace data)
import { supabase } from '../supabaseClient';

const TABLE = 'workspace';

// Fetch the workspace row for the current user
export async function getWorkspace(user_id) {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', user_id)
    .single();
  if (error) throw error;
  return data;
}

// Create a new workspace row for a user (if not exists)
export async function createWorkspace(user_id) {
  const { data, error } = await supabase
    .from(TABLE)
    .insert([
      { user_id, tasks: [], activity: [], calendar_events: [], files: [] }
    ])
    .single();
  if (error) throw error;
  return data;
}

// Update a specific section (tasks, activity, calendar_events, files)
export async function updateWorkspaceSection(user_id, section, value) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ [section]: value, updated_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update the entire workspace row (all fields)
export async function updateWorkspace(user_id, workspaceObj) {
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...workspaceObj, updated_at: new Date().toISOString() })
    .eq('user_id', user_id)
    .select()
    .single();
  if (error) throw error;
  return data;
}
