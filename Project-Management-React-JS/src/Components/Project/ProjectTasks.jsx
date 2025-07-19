import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { supabase } from '../../supabaseClient';
import API_BASE_URL from '../../apiConfig';
import './ProjectTasks.css';

const ProjectTasks = ({ projectId, userId, currentUser, viewMode }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, [projectId, userId]);

  const fetchTasks = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);

      const response = await fetch(`${API_BASE_URL}/api/project-tasks/${projectId}?${params}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTasks(data);
      }
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const createTask = async (taskData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          ...taskData,
          project_id: projectId
        })
      });

      if (response.ok) {
        const newTask = await response.json();
        setTasks(prev => [...prev, newTask]);
        setShowAddModal(false);
        toast.success('Task created successfully!');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ));
      }
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        const updatedTask = await response.json();
        setTasks(prev => prev.map(task => 
          task.id === taskId ? updatedTask : task
        ));
        toast.success(`Task status updated to ${status}`);
      }
    } catch (error) {
      console.error('Error updating task status:', error);
      toast.error('Failed to update task status');
    }
  };

  const deleteTask = async (taskId) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(`${API_BASE_URL}/api/project-tasks/${taskId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (response.ok) {
        setTasks(prev => prev.filter(task => task.id !== taskId));
        toast.success('Task deleted successfully!');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(tasks);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setTasks(items);
    
    // Update order in backend
    items.forEach((task, index) => {
      if (task.order_index !== index) {
        updateTask(task.id, { order_index: index });
      }
    });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'todo': return '#8c8c8c';
      case 'in_progress': return '#faad14';
      case 'done': return '#52c41a';
      case 'blocked': return '#ff4d4f';
      default: return '#8c8c8c';
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

  const canEditTask = (task) => {
    return task.user_id === currentUser?.id || viewMode === 'all';
  };

  if (loading) {
    return <div className="loading-spinner">Loading tasks...</div>;
  }

  return (
    <div className="project-tasks">
      <div className="tasks-header">
        <div className="header-info">
          <h2>
            {viewMode === 'me' ? 'My Tasks' : 
             viewMode === 'all' ? 'All Tasks' : 
             `Tasks`}
          </h2>
          <span className="tasks-count">{tasks.length} task(s)</span>
        </div>
        {(viewMode === 'me' || viewMode === 'all') && (
          <button 
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + Add Task
          </button>
        )}
      </div>

      {tasks.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📝</div>
          <h3>No tasks yet</h3>
          <p>Create your first task to get started.</p>
          {(viewMode === 'me' || viewMode === 'all') && (
            <button 
              className="btn btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              Create First Task
            </button>
          )}
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="tasks-list"
              >
                {tasks.map((task, index) => (
                  <Draggable key={task.id} draggableId={task.id} index={index}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        className={`task-card ${snapshot.isDragging ? 'dragging' : ''}`}
                      >
                        <div className="task-header">
                          <div className="task-priority" style={{ backgroundColor: getPriorityColor(task.priority) }}>
                            {task.priority}
                          </div>
                          <div className="task-status" style={{ color: getStatusColor(task.status) }}>
                            {task.status.replace('_', ' ')}
                          </div>
                        </div>
                        
                        <div className="task-content">
                          <h3 className="task-title">{task.title}</h3>
                          {task.description && (
                            <p className="task-description">{task.description}</p>
                          )}
                          
                          <div className="task-meta">
                            <div className="task-user">
                              <span>👤 {task.user?.name || task.user?.email}</span>
                            </div>
                            {task.due_date && (
                              <div className="task-due-date">
                                <span>📅 {new Date(task.due_date).toLocaleDateString()}</span>
                              </div>
                            )}
                            {task.estimated_hours && (
                              <div className="task-hours">
                                <span>⏱️ {task.estimated_hours}h estimated</span>
                              </div>
                            )}
                          </div>
                          
                          {task.tags && task.tags.length > 0 && (
                            <div className="task-tags">
                              {task.tags.map((tag, idx) => (
                                <span key={idx} className="task-tag">{tag}</span>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {canEditTask(task) && (
                          <div className="task-actions">
                            <div className="status-buttons">
                              <button 
                                className={`status-btn ${task.status === 'todo' ? 'active' : ''}`}
                                onClick={() => updateTaskStatus(task.id, 'todo')}
                                title="To Do"
                              >
                                📝
                              </button>
                              <button 
                                className={`status-btn ${task.status === 'in_progress' ? 'active' : ''}`}
                                onClick={() => updateTaskStatus(task.id, 'in_progress')}
                                title="In Progress"
                              >
                                ⚡
                              </button>
                              <button 
                                className={`status-btn ${task.status === 'done' ? 'active' : ''}`}
                                onClick={() => updateTaskStatus(task.id, 'done')}
                                title="Done"
                              >
                                ✅
                              </button>
                            </div>
                            <button 
                              className="btn-icon delete-btn"
                              onClick={() => deleteTask(task.id)}
                              title="Delete Task"
                            >
                              🗑️
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      )}

      {showAddModal && (
        <AddTaskModal
          onClose={() => setShowAddModal(false)}
          onSubmit={createTask}
        />
      )}
    </div>
  );
};

// Add Task Modal Component
const AddTaskModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assigned_to: '',
    due_date: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast.error('Task title is required');
      return;
    }

    const taskData = {
      title: formData.title,
      description: formData.description,
      assigned_to: formData.assigned_to || null,
      due_date: formData.due_date || null
    };

    onSubmit(taskData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add New Task</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Task Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="Enter task title..."
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe the task..."
              rows="3"
            />
          </div>
          
          <div className="form-group">
            <label>Assign To (Optional)</label>
            <select name="assigned_to" value={formData.assigned_to} onChange={handleChange}>
              <option value="">Assign to me</option>
              {/* Group members will be populated here */}
            </select>
          </div>
          
          <div className="form-group">
            <label>Due Date (Optional)</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Add Task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProjectTasks;
