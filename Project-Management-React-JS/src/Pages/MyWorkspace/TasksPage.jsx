import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
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

  return (
    <div className="tasks-page">
      <h2>My Tasks</h2>
      <form className="add-task-form" onSubmit={handleAddTask}>
        <input
          type="text"
          placeholder="Add new task..."
          value={newTask}
          onChange={e => setNewTask(e.target.value)}
        />
        <select
          value={newPriority}
          onChange={e => setNewPriority(e.target.value)}
        >
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <button type="submit">Add</button>
      </form>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="tasks">
          {(provided) => (
            <div
              className="task-list"
              {...provided.droppableProps}
              ref={provided.innerRef}
            >
              {tasks.length === 0 && <p className="no-tasks">No tasks yet. Add one!</p>}
              {tasks.map((task, idx) => (
                <Draggable key={task.id} draggableId={task.id} index={idx}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      style={getItemStyle(snapshot.isDragging, provided.draggableProps.style, task.priority)}
                      className={task.done ? 'task done' : 'task'}
                    >
                      {editingId === task.id ? (
                        <>
                          <input
                            value={editingText}
                            onChange={e => setEditingText(e.target.value)}
                          />
                          <select
                            value={editingPriority}
                            onChange={e => setEditingPriority(e.target.value)}
                          >
                            {PRIORITY_OPTIONS.map(opt => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <button onClick={() => handleSaveEdit(task.id)}>Save</button>
                          <button onClick={() => setEditingId(null)}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <span
                            className="task-text"
                            style={{ textDecoration: task.done ? 'line-through' : 'none' }}
                          >{task.text}</span>
                          <span className={`priority-pill ${task.priority.toLowerCase()}`}>{task.priority}</span>
                          <div className="task-actions">
                            <button title="Mark as done" onClick={() => handleToggleDone(task.id)}>
                              {task.done ? '↩️' : '✅'}
                            </button>
                            <button title="Edit" onClick={() => handleEditTask(task.id, task.text, task.priority)}>
                              ✏️
                            </button>
                            <button title="Delete" onClick={() => handleDeleteTask(task.id)}>
                              🗑️
                            </button>
                          </div>
                        </>
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
    </div>
  );
}
