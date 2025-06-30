import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Helmet } from 'react-helmet-async';
import './Group.css';
import API_BASE_URL from '../apiConfig';

// --- Helper API functions ---
const getGroupApi = (groupId, token) => {
  return fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.ok ? res.json() : Promise.reject('Failed to fetch group'));
};

const getTasksApi = (groupId, token) => {
  return fetch(`${API_BASE_URL}/api/tasks/group/${groupId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  }).then(res => res.ok ? res.json() : Promise.reject('Failed to fetch tasks'));
};

const createTaskApi = (groupId, taskData, token) => {
  return fetch(`${API_BASE_URL}/api/tasks/group/${groupId}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(taskData)
  }).then(res => res.ok ? res.json() : Promise.reject('Failed to create task'));
};

const getActivityLogApi = (groupId, token) => {
  console.log('Fetching activity for group:', groupId, 'with token:', token);
  return Promise.resolve([
    { id: 1, user: { name: 'Demo User' }, activity_type: 'task_created', details: 'created a new task: "Design the new logo"', created_at: new Date().toISOString() },
    { id: 2, user: { name: 'Demo User' }, activity_type: 'member_joined', details: 'joined the group', created_at: new Date().toISOString() },
  ]);
};

// --- Components ---
const TaskList = ({ tasks }) => (
  <div className="task-list">
    {tasks.length > 0 ? (
      tasks.map(task => (
        <div key={task.id} className={`task-card status-${task.status.toLowerCase().replace(' ', '-')}`}>
          <h3>{task.title}</h3>
          <p>{task.description}</p>
          <div className="task-meta">
            <span>Status: {task.status}</span>
            {task.due_date && <span>Due: {new Date(task.due_date).toLocaleDateString()}</span>}
          </div>
        </div>
      ))
    ) : (
      <p>No tasks yet. Create one to get started!</p>
    )}
  </div>
);

const ActivityLog = ({ logs }) => (
  <div className="activity-log">
    {logs.map(log => (
      <div key={log.id} className="log-item">
        <strong>{log.user?.name || 'A user'}</strong> {log.details} <span className="log-time">{new Date(log.created_at).toLocaleTimeString()}</span>
      </div>
    ))}
  </div>
);

const AddTaskForm = ({ onTaskCreate }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title) return;
    onTaskCreate({ title, description });
    setTitle('');
    setDescription('');
  };

  return (
    <form onSubmit={handleSubmit} className="add-task-form">
      <input 
        type="text" 
        value={title} 
        onChange={e => setTitle(e.target.value)} 
        placeholder="New task title..."
        required
      />
      <textarea 
        value={description} 
        onChange={e => setDescription(e.target.value)} 
        placeholder="(Optional) Description..."
      />
      <button type="submit">+ Add Task</button>
    </form>
  );
};

// --- Main Group Page Component ---
const Group = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const token = session.access_token;

      const [groupData, tasksData, logsData] = await Promise.all([
        getGroupApi(groupId, token),
        getTasksApi(groupId, token),
        getActivityLogApi(groupId, token)
      ]);

      setGroup(groupData);
      setTasks(tasksData);
      setLogs(logsData);

    } catch (err) {
      setError(err.message);
      console.error("Error fetching group data:", err);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateTask = async (taskData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const token = session.access_token;

      const newTask = await createTaskApi(groupId, taskData, token);
      setTasks(prevTasks => [newTask, ...prevTasks]);
      const newLog = { id: Date.now(), user: { name: 'You' }, details: `created a new task: "${newTask.title}"`, created_at: new Date().toISOString() };
      setLogs(prevLogs => [newLog, ...prevLogs]);
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Could not create task. Please try again.');
    }
  };

  if (loading) return <div className="page-container">Loading group...</div>;
  if (error) return <div className="page-container">Error: {error}</div>;
  if (!group) return <div className="page-container">Group not found.</div>;

  return (
    <div className="page-container group-page">
      <Helmet>
        <title>{group.group.name} - WitG</title>
      </Helmet>

      <header className="group-header">
        <h1>{group.group.name}</h1>
        <p>{group.group.description}</p>
      </header>

      <div className="group-layout">
        <main className="group-main-content">
          <h2>Tasks</h2>
          <AddTaskForm onTaskCreate={handleCreateTask} />
          <TaskList tasks={tasks} />
        </main>
        <aside className="group-sidebar">
          <div className="sidebar-widget">
            <h2>Members</h2>
            <ul className="member-list">
              {group.members.map(member => (
                <li key={member.user_id}>
                  {member.profiles.username} ({member.role})
                </li>
              ))}
            </ul>
          </div>
          <div className="sidebar-widget">
            <h2>Activity Log</h2>
            <ActivityLog logs={logs} />
          </div>
          {/* TODO: Add an 'Invite Member' button */}
        </aside>
      </div>
    </div>
  );
};

export default Group;
