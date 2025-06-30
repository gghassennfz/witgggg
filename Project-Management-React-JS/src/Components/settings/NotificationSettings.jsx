import React, { useState } from 'react';
import './NotificationSettings.css'; // We'll use similar styles to preferences

const NotificationToggle = ({ id, title, description, enabled, onToggle }) => {
  return (
    <div className="notification-item">
      <div className="notification-text">
        <h4>{title}</h4>
        <p>{description}</p>
      </div>
      <label className="switch">
        <input
          type="checkbox"
          onChange={() => onToggle(id)}
          checked={enabled}
        />
        <span className="slider round"></span>
      </label>
    </div>
  );
};

const NotificationSettings = () => {
  const [notifications, setNotifications] = useState({
    taskAlerts: true,
    mentions: true,
    comments: false,
    weeklySummary: true,
  });

  const handleToggle = (id) => {
    setNotifications(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
    // In a real app, you would also save this preference to the backend.
  };

  return (
    <div>
      <h3>Notification Settings</h3>
      <NotificationToggle
        id="taskAlerts"
        title="New Task Alerts"
        description="Receive an email when you are assigned a new task."
        enabled={notifications.taskAlerts}
        onToggle={handleToggle}
      />
      <NotificationToggle
        id="mentions"
        title="Group Mentions"
        description="Get notified when someone @mentions you in a group."
        enabled={notifications.mentions}
        onToggle={handleToggle}
      />
      <NotificationToggle
        id="comments"
        title="New Comments"
        description="Get notified for new comments on your tasks."
        enabled={notifications.comments}
        onToggle={handleToggle}
      />
      <NotificationToggle
        id="weeklySummary"
        title="Weekly Summary"
        description="Receive a summary of your activity every week."
        enabled={notifications.weeklySummary}
        onToggle={handleToggle}
      />
    </div>
  );
};

export default NotificationSettings;
