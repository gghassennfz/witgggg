import React from 'react';
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
        <h1>Welcome to WitG!</h1>
        <p>Your new hub for seamless collaboration and group management.</p>
        <div className="dashboard-actions">
          <Link to="/groups" className="btn btn-primary">
            Go to My Groups
          </Link>
          <Link to="/group/create" className="btn btn-secondary">
            + Create a New Group
          </Link>
        </div>
      </div>

      {/* You can add more dashboard widgets here later */}
      {/* For example: recent activity feed, assigned tasks, etc. */}
    </div>
  );
};

export default Dashboard;
