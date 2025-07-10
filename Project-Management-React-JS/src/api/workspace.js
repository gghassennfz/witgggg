// Supabase Workspace Backend API (single row per user, JSON arrays for all workspace data)
import { supabase } from '../supabaseClient';

const TABLE = 'workspace';

// --- Helper to get correct key ---
function getKeyFilter(id, isGroup) {
  return isGroup ? { group_id: id } : { user_id: id };
}

// Fetch the workspace row for the current user or group
export async function getWorkspace(id, isGroup = false) {
  const filter = getKeyFilter(id, isGroup);
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .match(filter)
    .single();
  if (error) throw error;
  return data;
}

// Create a new workspace row for a user or group (if not exists)
export async function createWorkspace(id, isGroup = false) {
  const row = isGroup
    ? { group_id: id, tasks: [], activity: [], calendar_events: [], files: [] }
    : { user_id: id, tasks: [], activity: [], calendar_events: [], files: [] };
  const { data, error } = await supabase
    .from(TABLE)
    .insert([row])
    .single();
  if (error) throw error;
  return data;
}

// Update a specific section (tasks, activity, calendar_events, files)
export async function updateWorkspaceSection(id, section, value, isGroup = false) {
  const filter = getKeyFilter(id, isGroup);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ [section]: value, updated_at: new Date().toISOString() })
    .match(filter)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update the entire workspace row (all fields)
export async function updateWorkspace(id, workspaceObj, isGroup = false) {
  const filter = getKeyFilter(id, isGroup);
  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...workspaceObj, updated_at: new Date().toISOString() })
    .match(filter)
    .select()
    .single();
  if (error) throw error;
  return data;
}
