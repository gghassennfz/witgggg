import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Helmet } from 'react-helmet-async';
import './Group.css';
import API_BASE_URL from '../apiConfig';
import socket from '../socket';

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

function TabNav({ tabs, activeTab, setActiveTab }) {
  return (
    <div className="tab-nav">
      {tabs.map(tab => (
        <button key={tab} className={activeTab === tab ? 'active' : ''} onClick={() => setActiveTab(tab)}>{tab}</button>
      ))}
    </div>
  );
}

const Group = () => {
  const { groupId } = useParams();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Members');

  // Fetch group details, members, and projects
  const fetchGroupDetails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const token = session.access_token;
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch group');
      const groupData = await res.json();
      setGroup(groupData);
      setMembers(groupData.members || []);
      setProjects(groupData.projects || []);
      setChatUser(session.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchGroupDetails();
    // eslint-disable-next-line
  }, [groupId]);

  // --- Members Section ---
  const handleInvite = async (email) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session.access_token;
      // Find user by email
      const { data: user, error: userError } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      if (userError || !user) throw new Error('User not found');
      // Add member via backend
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ user_id: user.id, role: 'member' })
      });
      if (!res.ok) throw new Error('Failed to invite user');
      await fetchGroupDetails();
      alert('User invited!');
    } catch (err) {
      alert('Error inviting user: ' + (err.message || err));
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session.access_token;
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to remove member');
      await fetchGroupDetails();
    } catch (err) {
      alert('Error removing member: ' + (err.message || err));
    }
  };

  // --- Projects Section ---
  const handleCreateProject = async (name, description) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session.access_token;
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, description })
      });
      if (!res.ok) throw new Error('Failed to create project');
      await fetchGroupDetails();
    } catch (err) {
      alert('Error creating project: ' + (err.message || err));
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Delete this project?')) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session.access_token;
      const res = await fetch(`${API_BASE_URL}/api/groups/${groupId}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete project');
      await fetchGroupDetails();
    } catch (err) {
      alert('Error deleting project: ' + (err.message || err));
    }
  };

  // --- UI for each tab ---
  function MembersTab() {
    const [inviteEmail, setInviteEmail] = useState('');
    return (
      <div>
        <h2>Members</h2>
        <ul className="member-list">
          {members.map(m => (
            <li key={m.user?.id || m.user_id}>
              {m.user?.username || m.user_id} ({m.role})
              <button onClick={() => handleRemoveMember(m.user?.id || m.user_id)} style={{marginLeft:8}}>Remove</button>
            </li>
          ))}
        </ul>
        <form onSubmit={e => { e.preventDefault(); handleInvite(inviteEmail); setInviteEmail(''); }} style={{ marginTop: 16 }}>
          <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="Invite by email..." required />
          <button type="submit">Invite</button>
        </form>
      </div>
    );
  }

  function ProjectsTab() {
    const [name, setName] = useState('');
    const [desc, setDesc] = useState('');
    return (
      <div>
        <h2>Projects</h2>
        <form onSubmit={e => { e.preventDefault(); handleCreateProject(name, desc); setName(''); setDesc(''); }} style={{ marginBottom: 16 }}>
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Project name..." required />
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description..." />
          <button type="submit">+ Add Project</button>
        </form>
        <ul className="project-list">
          {projects.map(p => (
            <li key={p.id}>
              <b>{p.name}</b> - {p.description}
              <button onClick={() => handleDeleteProject(p.id)} style={{marginLeft:8}}>Delete</button>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  function ChatTab() {
    return (
      <div>
        <h2>Group Chat</h2>
        <GroupChat groupId={groupId} currentUserId={chatUser?.id} />
      </div>
    );
  }

  if (loading) return <div>Loading...</div>;
  if (error) return (
    <div>
      <div className="group-details-page">
        <Helmet><title>Group</title></Helmet>
        <h1>Group</h1>
        <TabNav tabs={['Members', 'Projects', 'Chat']} activeTab={activeTab} setActiveTab={setActiveTab} />
        <div className="tab-content">
          {activeTab === 'Members' && <MembersTab empty />}
          {activeTab === 'Projects' && <ProjectsTab empty />}
          {activeTab === 'Chat' && <ChatTab empty />}
        </div>
      </div>
      <div style={{color:'red',marginTop:20}}>Error: {error}</div>
    </div>
  );
  if (!group) return (
    <div className="group-details-page">
      <Helmet><title>Group</title></Helmet>
      <h1>Group</h1>
      <TabNav tabs={['Members', 'Projects', 'Chat']} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="tab-content">
        {activeTab === 'Members' && <MembersTab empty />}
        {activeTab === 'Projects' && <ProjectsTab empty />}
        {activeTab === 'Chat' && <ChatTab empty />}
      </div>
      <div style={{color:'red',marginTop:20}}>Group not found or not loaded yet.</div>
    </div>
  );

  const tabs = ['Members', 'Projects', 'Chat'];

  return (
    <div className="group-details-page">
      <Helmet><title>Group: {group.name}</title></Helmet>
      <h1>{group.name}</h1>
      <TabNav tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      <div className="tab-content">
        {activeTab === 'Members' && <MembersTab />}
        {activeTab === 'Projects' && <ProjectsTab />}
        {activeTab === 'Chat' && <ChatTab />}
      </div>
    </div>
  );
};

// --- Group Chat Component ---
function GroupChat({ groupId, currentUserId }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const messagesEndRef = React.useRef(null);

  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join_group', groupId);
    socket.on('group_message', msg => {
      setMessages(prev => [...prev, msg]);
    });
    return () => {
      socket.emit('leave_group', groupId);
      socket.off('group_message');
      // Do not disconnect socket globally, let it persist for the session
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = e => {
    e.preventDefault();
    if (!input && !file) return;
    const msg = { groupId, userId: currentUserId, text: input, file: null };
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        msg.file = { name: file.name, data: reader.result };
        socket.emit('group_message', msg);
      };
      reader.readAsDataURL(file);
      setFile(null);
    } else {
      socket.emit('group_message', msg);
    }
    setInput('');
  };

  return (
    <div className="group-chat">
      <div className="chat-messages">
        {messages.map((msg, i) => (
          <div key={i} className="chat-msg">
            <b>{msg.userId}</b>: {msg.text}
            {msg.file && (
              <div><a href={msg.file.data} download={msg.file.name}>File: {msg.file.name}</a></div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form className="chat-input-form" onSubmit={sendMessage}>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type a message..."
        />
        <input
          type="file"
          onChange={e => setFile(e.target.files[0])}
        />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}

export default Group;

