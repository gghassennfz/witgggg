import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import API_BASE_URL from '../apiConfig';
import ProjectTasks from '../Components/Project/ProjectTasks';
import ProjectCalendar from '../Components/Project/ProjectCalendar';
import ProjectLogs from '../Components/Project/ProjectLogs';
import ProjectFiles from '../Components/Project/ProjectFiles';
import './ProjectDetails.css';

const ProjectDetails = () => {
  const { groupId, projectId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('tasks');
  const [selectedMember, setSelectedMember] = useState('me'); // 'me' or userId
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    fetchCurrentUser();
    fetchProject();
  }, [projectId]);

  const fetchCurrentUser = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUser(session.user);
      }
    } catch (error) {
      console.error('Error fetching current user:', error);
    }
  };

  const fetchProject = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProject(data);
      } else {
        throw new Error('Project not found');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
      navigate(`/group/${groupId}`);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredUserId = () => {
    if (selectedMember === 'me') {
      return currentUser?.id;
    }
    return selectedMember === 'all' ? null : selectedMember;
  };

  const tabs = [
    { id: 'tasks', label: 'My Tasks', icon: '✓' },
    { id: 'calendar', label: 'My Calendar', icon: '📅' },
    { id: 'logs', label: 'My Logs', icon: '📋' },
    { id: 'files', label: 'My Files', icon: '📁' }
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading project...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="page-container">
        <div className="error-state">
          <h3>Project not found</h3>
          <button onClick={() => navigate(`/group/${groupId}`)} className="btn btn-primary">
            Back to Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container project-details-page">
      <Helmet>
        <title>{project.name} - Project Details - WitG</title>
      </Helmet>

      {/* Project Header */}
      <div className="project-details-header">
        <div className="header-content">
          <div className="project-info">
            <div className="project-breadcrumb">
              <button 
                onClick={() => navigate(`/group/${groupId}`)}
                className="breadcrumb-link"
              >
                ← Back to Group
              </button>
            </div>
            <div className="project-title-section">
              <div className="project-color-indicator" style={{ backgroundColor: project.color }}></div>
              <div>
                <h1>{project.name}</h1>
                <p>{project.description}</p>
              </div>
            </div>
            <div className="project-meta-info">
              <span className={`status-badge status-${project.status}`}>
                {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
              </span>
              <span className={`priority-badge priority-${project.priority}`}>
                {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
              </span>
              {project.due_date && (
                <span className="due-date">
                  Due: {new Date(project.due_date).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>

          {/* Member Filter */}
          <div className="member-filter">
            <label>View:</label>
            <select 
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)}
              className="member-select"
            >
              <option value="me">My Work</option>
              <option value="all">All Members</option>
              {project.project_members?.map(member => (
                <option key={member.user_id} value={member.user_id}>
                  {member.user?.name || member.user?.email}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="project-nav">
        <div className="nav-tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">
                {selectedMember === 'me' ? tab.label : tab.label.replace('My ', '')}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="project-content">
        {activeTab === 'tasks' && (
          <ProjectTasks 
            projectId={projectId}
            userId={getFilteredUserId()}
            currentUser={currentUser}
            viewMode={selectedMember}
          />
        )}
        {activeTab === 'calendar' && (
          <ProjectCalendar 
            projectId={projectId}
            userId={getFilteredUserId()}
            currentUser={currentUser}
            viewMode={selectedMember}
          />
        )}
        {activeTab === 'logs' && (
          <ProjectLogs 
            projectId={projectId}
            userId={getFilteredUserId()}
            currentUser={currentUser}
            viewMode={selectedMember}
          />
        )}
        {activeTab === 'files' && (
          <ProjectFiles 
            projectId={projectId}
            userId={getFilteredUserId()}
            currentUser={currentUser}
            viewMode={selectedMember}
          />
        )}
      </div>
    </div>
  );
};

export default ProjectDetails;
