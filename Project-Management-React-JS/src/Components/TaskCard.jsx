import React from 'react';
import axios from 'axios';
import API_BASE_URL from '../apiConfig';
import './TaskCard.css';

const getPriorityClass = (priority) => {
  switch (priority) {
    case 'High': return 'priority-high';
    case 'Medium': return 'priority-medium';
    case 'Low': return 'priority-low';
    default: return '';
  }
};

import axios from 'axios';
import { toast } from 'react-toastify';
import Swal from 'sweetalert2';

const TaskCard = ({ task, fetchTasks, onEdit }) => {
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
          await axios.delete(`${API_BASE_URL}/api/tasks/${task.id}`);
          toast.success('Task deleted successfully!');
          fetchTasks();
        } catch (error) {
          toast.error('Failed to delete task.');
        }
      }
    });
  };

  return (
    <div className="task-card">
      <div className="task-card-header">
        <h4 className="task-card-title">{task.title}</h4>
        <span className={`task-priority ${getPriorityClass(task.priority)}`}>{task.priority}</span>
      </div>
      <p className="task-card-description">{task.description}</p>
      <div className="task-card-footer">
        {/* In a future step, we'll show assignee info here */}
        <span className="task-assignee">Unassigned</span>
        <div className="task-actions">
            <button className="action-btn" onClick={onEdit}><i className="uil uil-edit"></i></button>
            <button className="action-btn" onClick={handleDelete}><i className="uil uil-trash-alt"></i></button>
        </div>
      </div>
    </div>
  );
};

export default TaskCard;
