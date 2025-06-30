import React, { useState, useEffect } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AddProjectModal.css'; // Reuse styles
import API_BASE_URL from '../apiConfig';

Modal.setAppElement('#root');

const AddTaskModal = ({ isOpen, closeModal, fetchTasks }) => {
  const [projects, setProjects] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    project_id: '',
  });

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/projects`);
        setProjects(response.data);
        if (response.data.length > 0) {
          setFormData(prev => ({ ...prev, project_id: response.data[0].id }));
        }
      } catch (error) {
        toast.error('Failed to fetch projects for selection.');
      }
    };
    if (isOpen) {
      fetchProjects();
    }
  }, [isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/tasks`, formData);
      toast.success('Task created successfully!');
      fetchTasks();
      closeModal();
    } catch (error) {
      toast.error('Failed to create task.');
      console.error('Create Task Error:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onRequestClose={closeModal} className="modal-content" overlayClassName="modal-overlay">
      <div className="modal-header">
        <h2>New Task</h2>
        <button onClick={closeModal} className="close-btn"><i className="uil uil-times"></i></button>
      </div>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label htmlFor="project_id">Project</label>
          <select id="project_id" name="project_id" value={formData.project_id} onChange={handleChange} required>
            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label htmlFor="title">Task Title</label>
          <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="3"></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select id="priority" name="priority" value={formData.priority} onChange={handleChange}>
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </div>
        <div className="form-actions">
          <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary">Create Task</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddTaskModal;
