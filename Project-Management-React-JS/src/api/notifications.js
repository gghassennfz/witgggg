// Fetch notifications from backend
import API_BASE_URL from '../apiConfig';

export async function fetchNotifications(userId) {
  const res = await fetch(`${API_BASE_URL}/api/notifications?to=${userId}`);
  if (!res.ok) throw new Error('Failed to fetch notifications');
  return res.json();
}
