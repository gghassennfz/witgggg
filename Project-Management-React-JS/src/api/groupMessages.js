import API_BASE_URL from '../apiConfig';

// Fetch messages for a group (history)
export async function fetchGroupMessages(groupId, token) {
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/messages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('Failed to fetch group messages');
  return res.json();
}

// Send a new message to the backend (persist to DB)
export async function sendGroupMessage(groupId, message, token) {
  const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(message)
  });
  if (!res.ok) throw new Error('Failed to send group message');
  return res.json();
}
