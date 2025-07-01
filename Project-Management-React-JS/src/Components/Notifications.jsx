import React, { useEffect, useState } from 'react';
import socket from '../socket';
import { fetchNotifications } from '../api/notifications';

export default function Notifications({ currentUserId }) {
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!currentUserId) return;
    // Fetch persisted notifications
    fetchNotifications(currentUserId)
      .then((data) => {
        setNotifications(data);
        setUnread(data.filter(n => !n.read).length);
      })
      .catch(console.error);
  }, [currentUserId]);

  useEffect(() => {
    // Listen for real-time notifications
    socket.on('receive_notification', (notif) => {
      setNotifications((prev) => [notif, ...prev]);
      setUnread((u) => u + 1);
    });
    return () => {
      socket.off('receive_notification');
    };
  }, []);

  return (
    <div style={{ position: 'fixed', top: 10, right: 10, width: 300, background: '#fff', border: '1px solid #ccc', borderRadius: 8, padding: 10, boxShadow: '0 2px 8px #0001', zIndex: 1000 }}>
      <h4>Notifications {unread > 0 && <span style={{ color: 'red' }}>({unread})</span>}</h4>
      <ul style={{ maxHeight: 200, overflowY: 'auto', margin: 0, padding: 0 }}>
        {notifications.map((n, i) => (
          <li key={i} style={{ listStyle: 'none', margin: '8px 0', background: n.read ? '#f6f6f6' : '#e6f7ff', padding: 6, borderRadius: 4 }}>
            <b>{n.type}</b>: {n.message}
          </li>
        ))}
        {notifications.length === 0 && <li>No notifications</li>}
      </ul>
    </div>
  );
}
