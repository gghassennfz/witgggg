import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import '../../styles/design-system.css';
import './TasksPage.css';

const PRIORITY_OPTIONS = ['High', 'Medium', 'Low'];

function getItemStyle(isDragging, draggableStyle, priority) {
  const priorityColors = {
    High: '#ff4d4f',
    Medium: '#faad14',
    Low: '#52c41a',
  };
  return {
    userSelect: 'none',
    background: isDragging ? '#e6f7ff' : '#fff',
    borderLeft: `6px solid ${priorityColors[priority]}`,
    ...draggableStyle,
    boxShadow: isDragging ? '0 2px 8px rgba(24,144,255,0.15)' : '',
    marginBottom: 10,
    padding: 16,
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  };
}

export default function TasksPage({ tasks, addTask, editTask, deleteTask, toggleDone, reorderTasks }) {
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [editingId, setEditingId] = useState(null);
  const [editingText, setEditingText] = useState('');
  const [editingPriority, setEditingPriority] = useState('Medium');

  function handleAddTask(e) {
    e.preventDefault();
    if (!newTask.trim()) return;
    addTask({
      id: Date.now().toString(),
      text: newTask,
      priority: newPriority,
      done: false,
    });
    setNewTask('');
    setNewPriority('Medium');
  }

  function handleDeleteTask(id) {
    deleteTask(id);
  }

  function handleToggleDone(id) {
    toggleDone(id);
  }

  function handleEditTask(id, text, priority) {
    setEditingId(id);
    setEditingText(text);
    setEditingPriority(priority);
  }

  function handleSaveEdit(id) {
    editTask(id, editingText, editingPriority);
    setEditingId(null);
    setEditingText('');
    setEditingPriority('Medium');
  }

  function handleDragEnd(result) {
    if (!result.destination) return;
    const reordered = Array.from(tasks);
    const [removed] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, removed);
    reorderTasks(reordered);
  }

  const taskStats = {
    total: tasks.length,
    completed: tasks.filter(t => t.done).length,
    pending: tasks.filter(t => !t.done).length,
    high: tasks.filter(t => t.priority === 'High' && !t.done).length,
    medium: tasks.filter(t => t.priority === 'Medium' && !t.done).length,
    low: tasks.filter(t => t.priority === 'Low' && !t.done).length
  };

  return (
    <div className="tasks-page">
      <div className="tasks-header">
        <div className="header-content">
          <h2 className="page-title">
            <span className="title-icon">✅</span>
            My Tasks
          </h2>
          <p className="page-description">
            Organize and track your tasks with drag & drop functionality
          </p>
        </div>
        
        <div className="tasks-stats">
          <div className="stat-item">
            <span className="stat-value">{taskStats.total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{taskStats.completed}</span>
            <span className="stat-label">Done</span>
          </div>
          <div className="stat-item">
            <span className="stat-value">{taskStats.pending}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
      </div>

      <div className="add-task-section">
        <h3 className="section-title">
          <span className="section-icon">➕</span>
          Add New Task
        </h3>
        
        <form className="add-task-form" onSubmit={handleAddTask}>
          <div className="form-group">
            <div className="input-wrapper">
              <input
                type="text"
                className="task-input"
                placeholder="What needs to be done?"
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
              />
              <select
                className="priority-select"
                value={newPriority}
                onChange={e => setNewPriority(e.target.value)}
              >
                {PRIORITY_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt} Priority</option>
                ))}
              </select>
              <button type="submit" className="btn btn-primary">
                <span className="btn-icon">➕</span>
                Add Task
              </button>
            </div>
          </div>
        </form>
      </div>

      <div className="tasks-content">
        <div className="tasks-filters">
          <div className="filter-group">
            <span className="filter-label">Priority:</span>
            <div className="priority-indicators">
              <div className="priority-indicator high">
                <span className="indicator-dot"></span>
                <span className="indicator-label">High ({taskStats.high})</span>
              </div>
              <div className="priority-indicator medium">
                <span className="indicator-dot"></span>
                <span className="indicator-label">Medium ({taskStats.medium})</span>
              </div>
              <div className="priority-indicator low">
                <span className="indicator-dot"></span>
                <span className="indicator-label">Low ({taskStats.low})</span>
              </div>
            </div>
          </div>
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="tasks">
            {(provided) => (
              <div
                className="task-list"
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {tasks.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📝</div>
                    <h3 className="empty-title">No tasks yet</h3>
                    <p className="empty-description">
                      Create your first task above to get started with organizing your work
                    </p>
                  </div>
                ) : (
                  tasks.map((task, idx) => (
                    <Draggable key={task.id} draggableId={task.id} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`task-item ${task.done ? 'completed' : ''} ${snapshot.isDragging ? 'dragging' : ''}`}
                          data-priority={task.priority.toLowerCase()}
                        >
                          {editingId === task.id ? (
                            <div className="task-edit-form">
                              <div className="edit-inputs">
                                <input
                                  className="edit-input"
                                  value={editingText}
                                  onChange={e => setEditingText(e.target.value)}
                                  autoFocus
                                />
                                <select
                                  className="edit-select"
                                  value={editingPriority}
                                  onChange={e => setEditingPriority(e.target.value)}
                                >
                                  {PRIORITY_OPTIONS.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              </div>
                              <div className="edit-actions">
                                <button 
                                  className="btn btn-primary btn-sm"
                                  onClick={() => handleSaveEdit(task.id)}
                                >
                                  💾 Save
                                </button>
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => setEditingId(null)}
                                >
                                  ❌ Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="task-content">
                                <div className="task-checkbox">
                                  <input
                                    type="checkbox"
                                    checked={task.done}
                                    onChange={() => handleToggleDone(task.id)}
                                    className="checkbox-input"
                                  />
                                  <span className="checkbox-custom"></span>
                                </div>
                                
                                <div className="task-info">
                                  <span className="task-text">{task.text}</span>
                                  <div className="task-meta">
                                    <span className={`priority-badge priority-${task.priority.toLowerCase()}`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              
                              <div className="task-actions">
                                <button 
                                  className="action-btn edit"
                                  title="Edit task"
                                  onClick={() => handleEditTask(task.id, task.text, task.priority)}
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="action-btn delete"
                                  title="Delete task"
                                  onClick={() => handleDeleteTask(task.id)}
                                >
                                  🗑️
                                </button>
                                <div className="drag-handle" title="Drag to reorder">
                                  ⋮⋮
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
