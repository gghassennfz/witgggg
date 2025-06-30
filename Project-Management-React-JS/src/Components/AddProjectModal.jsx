import React, { useState } from 'react';
import Modal from 'react-modal';
import axios from 'axios';
import { toast } from 'react-toastify';
import './AddProjectModal.css';
import API_BASE_URL from '../apiConfig';

Modal.setAppElement('#root');

const AddProjectModal = ({ isOpen, closeModal, fetchProjects }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    repo_url: '',
    design_url: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BASE_URL}/api/projects`, formData);
      toast.success('Project created successfully!');
      fetchProjects();
      closeModal();
      setFormData({ title: '', description: '', repo_url: '', design_url: '' });
    } catch (error) {
      toast.error('Failed to create project.');
      console.error('Create Project Error:', error);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onRequestClose={closeModal}
      contentLabel="Add New Project"
      className="modal-content"
      overlayClassName="modal-overlay"
    >
      <div className="modal-header">
        <h2>New Project</h2>
        <button onClick={closeModal} className="close-btn"><i className="uil uil-times"></i></button>
      </div>
      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label htmlFor="title">Project Name</label>
          <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} required />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description</label>
          <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="4" required></textarea>
        </div>
        <div className="form-group">
          <label htmlFor="repo_url">GitHub Repository URL</label>
          <input type="url" id="repo_url" name="repo_url" value={formData.repo_url} onChange={handleChange} placeholder="https://github.com/user/repo" />
        </div>
        <div className="form-group">
          <label htmlFor="design_url">Figma/Design URL</label>
          <input type="url" id="design_url" name="design_url" value={formData.design_url} onChange={handleChange} placeholder="https://figma.com/file/..." />
        </div>
        <div className="form-actions">
          <button type="button" onClick={closeModal} className="btn btn-secondary">Cancel</button>
          <button type="submit" className="btn btn-primary">Create Project</button>
        </div>
      </form>
    </Modal>
  );
};

export default AddProjectModal;
