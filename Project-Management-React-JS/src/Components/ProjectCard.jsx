import React from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';
import './ProjectCard.css';
import API_BASE_URL from '../apiConfig';

const ProjectCard = ({ project, fetchProjects, onEdit }) => {
  const handleDelete = async () => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Yes, delete it!',
      background: '#1f2937',
      color: '#fff'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_BASE_URL}/api/projects/${project.id}`);
          toast.success('Project deleted successfully!');
          fetchProjects();
          Swal.fire(
            'Deleted!',
            'Your project has been deleted.',
            'success'
          )
        } catch (error) {
          toast.error('Failed to delete project.');
          console.error('Delete Project Error:', error);
        }
      }
    });
  };

  return (
    <div className="project-card">
      <div className="card-header">
        <h3 className="project-title">{project.title}</h3>
        <div className="project-actions">
          <button className="action-btn" onClick={onEdit}><i className="uil uil-edit"></i></button>
          <button className="action-btn" onClick={handleDelete}><i className="uil uil-trash-alt"></i></button>
        </div>
      </div>
      <p className="project-description">{project.description}</p>
      <div className="card-footer">
        <div className="project-links">
          {project.repo_url && <a href={project.repo_url} target="_blank" rel="noopener noreferrer"><i className="uil uil-github"></i> GitHub</a>}
          {project.design_url && <a href={project.design_url} target="_blank" rel="noopener noreferrer"><i className="uil uil-figma"></i> Figma</a>}
        </div>
      </div>
    </div>
  );
};

export default ProjectCard;
