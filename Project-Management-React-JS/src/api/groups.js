// Fetch groups from backend
import API_BASE_URL from '../apiConfig';

export async function fetchGroups() {
  const res = await fetch(`${API_BASE_URL}/api/groups`);
  if (!res.ok) throw new Error('Failed to fetch groups');
  return res.json();
}
