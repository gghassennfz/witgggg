import React from 'react';
import '../styles/design-system.css';
import './Dashboard.css';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  // In a real app, you might fetch user's name, recent activity, etc.
  // For now, we'll keep it simple.

  return (
    <div className="page-container dashboard-page">
      <Helmet>
        <title>Dashboard - WitG</title>
      </Helmet>

      <div className="welcome-card">
        <div className="welcome-header">
          <h1 className="welcome-title">Welcome to WitG!</h1>
          <p className="welcome-subtitle">Your new hub for seamless collaboration and group management.</p>
        </div>
        
        <div className="dashboard-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <h3>Groups</h3>
              <p>Manage your teams</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <h3>Projects</h3>
              <p>Track progress</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💬</div>
            <div className="stat-content">
              <h3>Messages</h3>
              <p>Stay connected</p>
            </div>
          </div>
        </div>
        
        <div className="dashboard-actions">
          <Link to="/groups" className="btn btn-primary">
            <span className="btn-icon">👥</span>
            Go to My Groups
          </Link>
          <Link to="/group/create" className="btn btn-secondary">
            <span className="btn-icon">➕</span>
            Create a New Group
          </Link>
        </div>
      </div>
      
      <div className="dashboard-widgets">
        <div className="widget-card">
          <h3 className="widget-title">Quick Actions</h3>
          <div className="quick-actions">
            <Link to="/myworkspace" className="quick-action">
              <span className="action-icon">🏠</span>
              <span>My Workspace</span>
            </Link>
            <Link to="/mates" className="quick-action">
              <span className="action-icon">👫</span>
              <span>My Mates</span>
            </Link>
            <Link to="/settings" className="quick-action">
              <span className="action-icon">⚙️</span>
              <span>Settings</span>
            </Link>
          </div>
        </div>
        
        <div className="widget-card">
          <h3 className="widget-title">Recent Activity</h3>
          <div className="activity-feed">
            <div className="activity-item">
              <div className="activity-icon">🎉</div>
              <div className="activity-content">
                <p>Welcome to WitG! Start by creating your first group.</p>
                <span className="activity-time">Just now</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* You can add more dashboard widgets here later */}
      {/* For example: recent activity feed, assigned tasks, etc. */}
    </div>
  );
};

export default Dashboard;
