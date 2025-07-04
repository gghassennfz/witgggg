import React from 'react';
import './ActivityPage.css';

export default function ActivityPage({ activity = [] }) {
  return (
    <div className="activity-page">
      <h2>Recent Activity</h2>
      {activity.length === 0 ? (
        <p className="no-activity">No activity yet.</p>
      ) : (
        <ul className="activity-list">
          {activity.map((item, idx) => (
            <li key={idx} className={`activity-item ${item.type}`}>
              <span className="activity-time">{item.time}</span>
              <span className="activity-desc">{item.desc}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
