import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import API_BASE_URL from '../apiConfig';
import './Projects.css';

const Projects = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [group, setGroup] = useState(null);

  useEffect(() => {
    fetchProjects();
    fetchGroupInfo();
  }, [groupId]);

  const fetchProjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/projects/group/${groupId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroupInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('groups')
        .select('id, name, description')
        .eq('id', groupId)
        .single();
      
      if (error) throw error;
      setGroup(data);
    } catch (error) {
      console.error('Error fetching group info:', error);
    }
  };

  const handleCreateProject = async (projectData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...projectData,
          group_id: groupId
        })
      });

      if (response.ok) {
        const newProject = await response.json();
        setProjects(prev => [newProject, ...prev]);
        setShowCreateModal(false);
        toast.success('Project created successfully!');
        
        // Navigate to project details
        navigate(`/group/${groupId}/project/${newProject.id}`);
      } else {
        throw new Error('Failed to create project');
      }
    } catch (error) {
      console.error('Error creating project:', error);
      toast.error('Failed to create project');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return '#52c41a';
      case 'completed': return '#1890ff';
      case 'archived': return '#8c8c8c';
      default: return '#52c41a';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#ff4d4f';
      case 'medium': return '#faad14';
      case 'low': return '#52c41a';
      default: return '#faad14';
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">Loading projects...</div>
      </div>
    );
  }

  return (
    <div className="page-container projects-page">
      <Helmet>
        <title>Projects - {group?.name || 'Group'} - WitG</title>
      </Helmet>

      <div className="projects-header">
        <div className="header-content">
          <div className="header-info">
            <h1>Projects</h1>
            <p>Manage projects for <strong>{group?.name}</strong></p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Project
          </button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No projects yet</h3>
          <p>Create your first project to get started with organized collaboration.</p>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            Create First Project
          </button>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map(project => (
            <div key={project.id} className="project-card">
              <div className="project-header">
                <div className="project-color" style={{ backgroundColor: project.color }}></div>
                <div className="project-meta">
                  <div className="project-status" style={{ color: getStatusColor(project.status) }}>
                    {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                  </div>
                  <div className="project-priority" style={{ color: getPriorityColor(project.priority) }}>
                    {project.priority.charAt(0).toUpperCase() + project.priority.slice(1)} Priority
                  </div>
                </div>
              </div>
              
              <div className="project-content">
                <h3 className="project-title">{project.name}</h3>
                <p className="project-description">{project.description}</p>
                
                {project.due_date && (
                  <div className="project-due-date">
                    <span>Due: {new Date(project.due_date).toLocaleDateString()}</span>
                  </div>
                )}
                
                <div className="project-members">
                  <span className="members-count">
                    {project.project_members?.length || 0} member(s)
                  </span>
                </div>
              </div>
              
              <div className="project-actions">
                <Link 
                  to={`/group/${groupId}/project/${project.id}`}
                  className="btn btn-primary btn-sm"
                >
                  Open Project
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSubmit={handleCreateProject}
        />
      )}
    </div>
  );
};

// Create Project Modal Component
const CreateProjectModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    color: '#007bff',
    due_date: '',
    github_repo: '',
    design_files: [],
    resources: {}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter project name..."
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your project..."
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>GitHub Repository (Optional)</label>
            <input
              type="url"
              name="github_repo"
              value={formData.github_repo}
              onChange={handleChange}
              placeholder="https://github.com/username/repo"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Projects;
