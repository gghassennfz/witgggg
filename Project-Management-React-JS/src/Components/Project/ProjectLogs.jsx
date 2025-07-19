import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../supabaseClient';
import API_BASE_URL from '../../apiConfig';
import './ProjectLogs.css';

const ProjectLogs = ({ projectId, userId, currentUser, viewMode }) => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchLogs();
    fetchStats();
  }, [projectId, userId, filter]);

  const fetchLogs = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (filter !== 'all') params.append('actionType', filter);
      params.append('limit', '50');

      const response = await fetch(`${API_BASE_URL}/api/project-logs/${projectId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast.error('Failed to load activity logs');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      params.append('days', '30');

      const response = await fetch(`${API_BASE_URL}/api/project-logs/${projectId}/stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getActionIcon = (actionType) => {
    switch (actionType) {
      case 'task_created': return '✅';
      case 'task_updated': return '📝';
      case 'task_completed': return '🎉';
      case 'task_deleted': return '🗑️';
      case 'file_uploaded': return '📁';
      case 'file_deleted': return '🗂️';
      case 'event_created': return '📅';
      case 'event_updated': return '📆';
      case 'event_deleted': return '🗓️';
      case 'project_updated': return '⚙️';
      default: return '📋';
    }
  };

  const getActionColor = (actionType) => {
    switch (actionType) {
      case 'task_created':
      case 'file_uploaded':
      case 'event_created':
        return '#52c41a';
      case 'task_updated':
      case 'event_updated':
      case 'project_updated':
        return '#faad14';
      case 'task_completed':
        return '#1890ff';
      case 'task_deleted':
      case 'file_deleted':
      case 'event_deleted':
        return '#ff4d4f';
      default:
        return '#8c8c8c';
    }
  };

  const formatActionType = (actionType) => {
    if (!actionType || typeof actionType !== 'string') {
      return 'Unknown Action';
    }
    return actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getRelativeTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    
    return date.toLocaleDateString();
  };

  const filterOptions = [
    { value: 'all', label: 'All Activities' },
    { value: 'task_created', label: 'Tasks Created' },
    { value: 'task_updated', label: 'Tasks Updated' },
    { value: 'task_completed', label: 'Tasks Completed' },
    { value: 'file_uploaded', label: 'Files Uploaded' },
    { value: 'event_created', label: 'Events Created' }
  ];

  if (loading) {
    return <div className="loading-spinner">Loading activity logs...</div>;
  }

  return (
    <div className="project-logs">
      <div className="logs-header">
        <div className="header-info">
          <h2>
            {viewMode === 'me' ? 'My Activity' : 
             viewMode === 'all' ? 'Team Activity' : 
             `Activity Logs`}
          </h2>
          <span className="logs-count">{logs.length} recent activities</span>
        </div>
        
        <div className="logs-filters">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value)}
            className="filter-select"
          >
            {filterOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Activity Stats */}
      {stats && (
        <div className="activity-stats">
          <div className="stat-card">
            <div className="stat-number">{stats.totalActivities}</div>
            <div className="stat-label">Total Activities</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">
              {Object.keys(stats.activitiesByType).length}
            </div>
            <div className="stat-label">Activity Types</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">
              {Object.keys(stats.activitiesByUser).length}
            </div>
            <div className="stat-label">Active Members</div>
          </div>
          
          <div className="stat-card">
            <div className="stat-number">
              {Object.keys(stats.activitiesByDay).length}
            </div>
            <div className="stat-label">Active Days</div>
          </div>
        </div>
      )}

      {/* Activity Timeline */}
      {logs.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No activity yet</h3>
          <p>Activity will appear here as team members work on the project.</p>
        </div>
      ) : (
        <div className="logs-timeline">
          {logs.map((log, index) => (
            <div key={log.id} className="log-item">
              <div className="log-icon" style={{ backgroundColor: getActionColor(log.action_type) }}>
                {getActionIcon(log.action_type)}
              </div>
              
              <div className="log-content">
                <div className="log-header">
                  <div className="log-user">
                    <strong>{log.user?.name || log.user?.email}</strong>
                  </div>
                  <div className="log-time">
                    {getRelativeTime(log.created_at)}
                  </div>
                </div>
                
                <div className="log-description">
                  {log.action_description}
                </div>
                
                <div className="log-meta">
                  <span className="log-type">
                    {formatActionType(log.action_type)}
                  </span>
                  {log.entity_type && (
                    <span className="log-entity">
                      {log.entity_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load More Button */}
      {logs.length >= 50 && (
        <div className="load-more">
          <button 
            className="btn btn-secondary"
            onClick={() => {
              // Implement pagination
              toast.info('Load more functionality coming soon!');
            }}
          >
            Load More Activities
          </button>
        </div>
      )}
    </div>
  );
};

export default ProjectLogs;
