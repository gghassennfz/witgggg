 import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getWorkspace, createWorkspace, updateWorkspace } from '../api/workspace';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import TasksPage from './MyWorkspace/TasksPage';
import ActivityPage from './MyWorkspace/ActivityPage';
import CalendarPage from './MyWorkspace/CalendarPage';
import FilesPage from './MyWorkspace/FilesPage';
import '../styles/design-system.css';
import './MyWorkspace/MyWorkspace.css';

function getNowTime() {
  return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function MyWorkspace({ groupId }) {
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [activity, setActivity] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]); // { id, taskId, title, start, end }
  const [files, setFiles] = useState([]); // { id, name, type, url, uploadedAt }

  // Fetch workspace on mount
  useEffect(() => {
    let ignore = false;
    async function fetchWorkspace() {
      setLoading(true);
      setError(null);
      try {
        let key = groupId;
        let isGroup = !!groupId;
        if (!key) {
          // fallback to user workspace
          const { data: { session } } = await supabase.auth.getSession();
          if (!session?.user?.id) throw new Error('Not authenticated');
          key = session.user.id;
          setUserId(session.user.id);
          isGroup = false;
        }
        let workspace;
        try {
          workspace = await getWorkspace(key, isGroup);
        } catch (err) {
          if (err.code === 'PGRST116' || err.message.includes('No rows')) {
            workspace = await createWorkspace(key, isGroup);
          } else {
            throw err;
          }
        }
        if (!ignore && workspace) {
          setTasks(workspace.tasks || []);
          setActivity(workspace.activity || []);
          setCalendarEvents(workspace.calendar_events || []);
          setFiles(workspace.files || []);
        }
      } catch (err) {
        if (!ignore) setError(err.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchWorkspace();
    return () => { ignore = true; };
  }, [groupId]);

  // Update workspace in Supabase when any state changes (after initial load)
  useEffect(() => {
    const key = groupId || userId;
    const isGroup = !!groupId;
    if (!key || loading) return;
    // Debounce updates
    const timeout = setTimeout(() => {
      updateWorkspace(key, {
        tasks,
        activity,
        calendar_events: calendarEvents,
        files
      }, isGroup).catch(e => console.error('Workspace update error:', e));
    }, 400);
    return () => clearTimeout(timeout);
  }, [tasks, activity, calendarEvents, files, groupId, userId, loading]);

  // Log an activity event
  const logActivity = useCallback((desc, type = 'info') => {
    setActivity(act => [
      { desc, type, time: getNowTime() },
      ...act
    ].slice(0, 50)); // keep last 50
  }, []);

  // Wrapped task actions for TasksPage
  const addTask = (task) => {
    setTasks(ts => [...ts, task]);
    logActivity(`Added task: "${task.text}"`, 'add');
  };
  const editTask = (id, newText, newPriority) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, text: newText, priority: newPriority } : t));
    logActivity(`Edited task: "${newText}"`, 'edit');
  };
  const deleteTask = (id) => {
    const task = tasks.find(t => t.id === id);
    setTasks(ts => ts.filter(t => t.id !== id));
    setCalendarEvents(evts => evts.filter(e => e.taskId !== id));
    if (task) logActivity(`Deleted task: "${task.text}"`, 'delete');
  };
  const toggleDone = (id) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t));
    const task = tasks.find(t => t.id === id);
    if (task) logActivity(`${task.done ? 'Reopened' : 'Completed'} task: "${task.text}"`, 'done');
  };
  const reorderTasks = (newTasks) => {
    setTasks(newTasks);
    logActivity('Reordered tasks', 'reorder');
  };

  // Calendar event handlers
  const addOrEditEvent = (event) => {
    setCalendarEvents(evts => {
      const exists = evts.find(e => e.id === event.id);
      if (exists) {
        return evts.map(e => e.id === event.id ? event : e);
      } else {
        return [...evts, event];
      }
    });
    logActivity(`Set deadline for: "${event.title}"`, 'calendar');
  };
  const deleteEvent = (eventId) => {
    const event = calendarEvents.find(e => e.id === eventId);
    setCalendarEvents(evts => evts.filter(e => e.id !== eventId));
    if (event) logActivity(`Removed deadline for: "${event.title}"`, 'calendar');
  };

  // File upload handlers
  const handleUploadFiles = (uploadedFiles) => {
    const newFiles = Array.from(uploadedFiles).map(file => ({
      id: Date.now().toString() + Math.random(),
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      uploadedAt: new Date().toLocaleString(),
    }));
    setFiles(f => [...newFiles, ...f]);
    newFiles.forEach(f => logActivity(`Uploaded file: "${f.name}"`, 'file'));
  };
  const handleDeleteFile = (id) => {
    const file = files.find(f => f.id === id);
    setFiles(f => f.filter(file => file.id !== id));
    if (file) logActivity(`Deleted file: "${file.name}"`, 'file');
  };

  const workspaceTabs = [
    {
      path: 'tasks',
      label: 'Tasks',
      icon: '✅',
      description: 'Manage your tasks and to-dos',
      count: tasks.length
    },
    {
      path: 'activity',
      label: 'Activity',
      icon: '📊',
      description: 'View recent workspace activity',
      count: activity.length
    },
    {
      path: 'calendar',
      label: 'Calendar',
      icon: '📅',
      description: 'Schedule and track events',
      count: calendarEvents.length
    },
    {
      path: 'files',
      label: 'Files',
      icon: '📁',
      description: 'Manage workspace files',
      count: files.length
    }
  ];

  if (loading) {
    return (
      <div className="myworkspace-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading workspace...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="myworkspace-page">
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <h3>Error Loading Workspace</h3>
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="myworkspace-page">
      <div className="page-hero">
        <div className="hero-content">
          <h1 className="page-title">
            <span className="title-icon">🏢</span>
            {groupId ? 'Group Workspace' : 'My Workspace'}
          </h1>
          <p className="page-subtitle">
            {groupId ? 'Collaborate with your team members' : 'Organize your personal tasks and projects'}
          </p>
          
          <div className="workspace-stats">
            {workspaceTabs.map((tab) => (
              <div key={tab.path} className="stat-card">
                <div className="stat-icon">{tab.icon}</div>
                <div className="stat-info">
                  <div className="stat-value">{tab.count}</div>
                  <div className="stat-label">{tab.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="myworkspace-container">
        <nav className="myworkspace-navbar">
          <div className="navbar-header">
            <h3 className="navbar-title">Workspace</h3>
          </div>
          
          <div className="navbar-tabs">
            {workspaceTabs.map((tab) => (
              <NavLink 
                key={tab.path}
                to={tab.path} 
                className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
              >
                <div className="tab-icon">{tab.icon}</div>
                <div className="tab-content">
                  <span className="tab-label">{tab.label}</span>
                  <span className="tab-description">{tab.description}</span>
                </div>
                <div className="tab-badge">{tab.count}</div>
              </NavLink>
            ))}
          </div>
        </nav>
        
        <div className="myworkspace-content">
          <Routes>
            <Route index element={<Navigate to="tasks" replace />} />
            <Route path="tasks" element={<TasksPage
              tasks={tasks}
              addTask={addTask}
              editTask={editTask}
              deleteTask={deleteTask}
              toggleDone={toggleDone}
              reorderTasks={reorderTasks}
            />} />
            <Route path="activity" element={<ActivityPage activity={activity} />} />
            <Route path="calendar" element={<CalendarPage
              tasks={tasks}
              events={calendarEvents}
              addOrEditEvent={addOrEditEvent}
              deleteEvent={deleteEvent}
            />} />
            <Route path="files" element={<FilesPage
              files={files}
              onUpload={handleUploadFiles}
              onDelete={handleDeleteFile}
            />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}
