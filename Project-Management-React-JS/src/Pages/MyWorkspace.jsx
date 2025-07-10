 import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { getWorkspace, createWorkspace, updateWorkspace } from '../api/workspace';
import { NavLink, Routes, Route, Navigate } from 'react-router-dom';
import TasksPage from './MyWorkspace/TasksPage';
import ActivityPage from './MyWorkspace/ActivityPage';
import CalendarPage from './MyWorkspace/CalendarPage';
import FilesPage from './MyWorkspace/FilesPage';
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

  return (
    <div className="myworkspace-container">
      <nav className="myworkspace-navbar">
        <NavLink to="tasks" className={({ isActive }) => isActive ? 'active' : ''}>Tasks</NavLink>
        <NavLink to="activity" className={({ isActive }) => isActive ? 'active' : ''}>Recent Activity</NavLink>
        <NavLink to="calendar" className={({ isActive }) => isActive ? 'active' : ''}>Calendar</NavLink>
        <NavLink to="files" className={({ isActive }) => isActive ? 'active' : ''}>Files</NavLink>
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
  );
}
