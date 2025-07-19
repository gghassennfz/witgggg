import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Helmet } from 'react-helmet-async';
import { toast } from 'react-toastify';
import './Group.css';
import '../Components/GroupCallModal.css';
import GroupCallModal from '../Components/GroupCallModal';
import EnhancedGroupChat from '../Components/EnhancedGroupChat';
import API_BASE_URL from '../apiConfig';
import socket from '../socket';
import { fetchGroupMessages, sendGroupMessage } from '../api/groupMessages';

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
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [chatUser, setChatUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('Members');

  // --- Mates state for inviting friends ---
  const [mates, setMates] = useState([]); // All mates (friends)
  const [eligibleInvitees, setEligibleInvitees] = useState([]); // Mates not in group

  // Fetch mates (friends) and filter eligible invitees
  const fetchMates = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');
      const token = session.access_token;
      // Fetch mates from backend
      const res = await fetch(`${API_BASE_URL}/api/mates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch mates');
      const matesData = await res.json();
      setMates(matesData.mates || []);
      // Filter mates not in group
      if (members && matesData.mates) {
        const memberIds = new Set(members.map(m => m.user?.id || m.user_id));
        const eligible = matesData.mates.filter(mate => {
          const mateId = mate.mateInfo?.id || mate.id;
          return !memberIds.has(mateId);
        });
        setEligibleInvitees(eligible);
      } else {
        setEligibleInvitees([]);
      }
    } catch (err) {
      // Optionally handle error
      setMates([]);
      setEligibleInvitees([]);
    }
  }, [members]);

  // Fetch mates whenever members change (to update eligible invitees)
  useEffect(() => {
    fetchMates();
  }, [fetchMates]);

  // Fetch group details, members, and projects
  const fetchGroupDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session.access_token;
      // Fetch group details
      const groupData = await getGroupApi(groupId, token);
      setGroup(groupData);
      // Fetch members from members jsonb array
      let memberRows = [];
      if (groupData && Array.isArray(groupData.members) && groupData.members.length > 0) {
        // Optionally, only show accepted members, or show all with status
        const acceptedMembers = groupData.members.filter(m => m.status === 'accepted');
        const { data: profiles, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', acceptedMembers.map(m => m.user_id));
        if (profilesError) throw profilesError;
        memberRows = acceptedMembers.map(m => ({
          user: profiles.find(p => p.id === m.user_id),
          status: m.status
        }));
      }
      setMembers(memberRows);
      // Fetch projects
      const { data: projectRows, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('group_id', groupId);
      if (projectError) throw projectError;
      setProjects(projectRows);
    } catch (err) {
      setError(err.message || 'Failed to load group');
    } finally {
      setLoading(false);
    }
  };
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
      // Fetch current members array
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('members')
        .eq('id', groupId)
        .single();
      if (groupError) throw groupError;
      const currentMembers = groupData.members || [];
      // Only add if not already present
      if (!currentMembers.some(m => m.user_id === user.id)) {
        const updatedMembers = [...currentMembers, { user_id: user.id, status: 'pending' }];
        const { error: updateError } = await supabase
          .from('groups')
          .update({ members: updatedMembers })
          .eq('id', groupId);
        if (updateError) throw updateError;
      }
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
    <div className="members-tab">
      <h2 style={{ color: '#222', marginBottom: '1.3rem' }}>Members</h2>
      <ul className="member-list">
        {members.length > 0 ? members.map(m => (
          <li className="member-row" key={m.user?.id || m.user_id}>
            <img
              className="avatar"
              src={m.user?.avatar_url || '/default-avatar.png'}
              alt={m.user?.username || 'User'}
              style={{ background: '#eee', border: '1px solid #ccc' }}
            />
            <span className="member-name" style={{ color: '#222' }}>{m.user?.username || m.user_id}</span>
            {m.status && (
              <span className="member-role" style={{ color: m.status === 'accepted' ? '#27ae60' : m.status === 'pending' ? '#f39c12' : '#888', fontWeight: 500, marginLeft: 8, marginRight: 8 }}>
                {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
              </span>
            )}
            <button className="remove-btn" onClick={() => handleRemoveMember(m.user?.id || m.user_id)}>
              Remove
            </button>
          </li>
        )) : (
          <li className="member-row empty">No members yet.</li>
        )}
      </ul>

      <div style={{ marginTop: 32, background: '#f7faff', padding: '1.2rem 1.5rem', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
        <h3 style={{ color: '#007bff', marginBottom: 12 }}>Invite a Mate</h3>
        {eligibleInvitees.length > 0 ? (
          <ul className="invite-list">
            {eligibleInvitees.map(mate => (
              <li className="member-row" key={mate.mateInfo?.id || mate.id}>
                <span style={{ color: '#222' }}>{mate.mateInfo?.username || mate.username} <span style={{ color: '#888' }}>(#{mate.mateInfo?.code || mate.code})</span></span>
                <button className="remove-btn" style={{ background: '#27ae60', marginLeft: 12 }} onClick={() => handleInvite(mate.mateInfo?.email || mate.email)}>Invite</button>
              </li>
            ))}
          </ul>
        ) : (
          <p style={{ color: '#888', margin: 0 }}>No mates available to invite.</p>
        )}
        <form className="invite-form" onSubmit={e => { e.preventDefault(); handleInvite(inviteEmail); setInviteEmail(''); }} style={{ marginTop: 18 }}>
          <input
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="Invite by email..."
            required
            style={{ color: '#222', background: '#fff', border: '1px solid #bbb' }}
          />
          <button type="submit" style={{ background: '#007bff', color: '#fff', fontWeight: 500 }}>Invite</button>
        </form>
      </div>
    </div>
  );
}


  function ProjectsTab() {
    const [showCreateModal, setShowCreateModal] = useState(false);
    
    const handleCreateProject = async (projectData) => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const response = await fetch(`${API_BASE_URL}/api/projects`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            ...projectData,
            group_id: groupId
          })
        });

        if (response.ok) {
          const newProject = await response.json();
          setProjects(prev => [newProject, ...prev]);
          setShowCreateModal(false);
          toast.success('Project created successfully!');
          
          // Navigate to project details
          navigate(`/group/${groupId}/project/${newProject.id}`);
        } else {
          throw new Error('Failed to create project');
        }
      } catch (error) {
        console.error('Error creating project:', error);
        toast.error('Failed to create project');
      }
    };

    const getStatusColor = (status) => {
      switch (status) {
        case 'active': return '#52c41a';
        case 'completed': return '#1890ff';
        case 'archived': return '#8c8c8c';
        default: return '#52c41a';
      }
    };

    const getPriorityColor = (priority) => {
      switch (priority) {
        case 'high': return '#ff4d4f';
        case 'medium': return '#faad14';
        case 'low': return '#52c41a';
        default: return '#faad14';
      }
    };

    return (
      <div className="projects-tab">
        <div className="projects-header">
          <div className="header-info">
            <h2>Projects</h2>
            <span className="projects-count">{projects.length} project(s)</span>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            + Create Project
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No projects yet</h3>
            <p>Create your first project to get started with organized collaboration.</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateModal(true)}
            >
              Create First Project
            </button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => (
              <div key={project.id} className="project-card">
                <div className="project-header">
                  <div className="project-color" style={{ backgroundColor: project.color || '#007bff' }}></div>
                  <div className="project-meta">
                    <div className="project-status" style={{ color: getStatusColor(project.status) }}>
                      {project.status?.charAt(0).toUpperCase() + project.status?.slice(1) || 'Active'}
                    </div>
                    <div className="project-priority" style={{ color: getPriorityColor(project.priority) }}>
                      {project.priority?.charAt(0).toUpperCase() + project.priority?.slice(1) || 'Medium'} Priority
                    </div>
                  </div>
                </div>
                
                <div className="project-content">
                  <h3 className="project-title">{project.name}</h3>
                  <p className="project-description">{project.description}</p>
                  
                  {project.due_date && (
                    <div className="project-due-date">
                      <span>Due: {new Date(project.due_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  
                  <div className="project-members">
                    <span className="members-count">
                      {members.length} member(s)
                    </span>
                  </div>
                </div>
                
                <div className="project-actions">
                  <button 
                    className="btn btn-primary btn-sm"
                    onClick={() => navigate(`/group/${groupId}/project/${project.id}`)}
                  >
                    Open Project
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {showCreateModal && (
          <CreateProjectModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateProject}
          />
        )}
      </div>
    );
  }

  function ChatTab() {
    return (
      <div className="chat-tab-container">
        <EnhancedGroupChat 
          groupId={groupId} 
          currentUser={chatUser}
          groupMembers={members}
        />
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

  if (!group) return <div>Loading...</div>;
  if (group.is_private) {
    return <MyWorkspace groupId={group.id} />;
  }
  return (
    <div className="myworkspace-container group-details-page">
      <Helmet><title>Group: {group.name}</title></Helmet>
      <div className="myworkspace-navbar group-navbar">
        <h1 style={{ fontSize: '2rem', margin: 0, flex: 1 }}>{group.name}</h1>
        <TabNav tabs={tabs} activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
      <div className="myworkspace-content group-content">
        {activeTab === 'Members' && <MembersTab />}
        {activeTab === 'Projects' && <ProjectsTab />}
        {activeTab === 'Chat' && <ChatTab />}
      </div>
    </div>
  );
};

// --- Group Chat Component ---
function GroupChat({ groupId, currentUserId, members }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [file, setFile] = useState(null);
  const messagesEndRef = React.useRef(null);
  const [loading, setLoading] = useState(true);

  // Fetch initial messages from backend
  useEffect(() => {
    let ignore = false;
    async function fetchHistory() {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        if (!token) throw new Error('Not authenticated');
        const msgs = await fetchGroupMessages(groupId, token);
        if (!ignore) setMessages(msgs || []);
      } catch (err) {
        if (!ignore) setMessages([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    fetchHistory();
    return () => { ignore = true; };
  }, [groupId]);

  // Socket setup for real-time
  useEffect(() => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('join_group', groupId);
    const handleMsg = msg => setMessages(prev => [...prev, msg]);
    socket.on('group_message', handleMsg);
    return () => {
      socket.emit('leave_group', groupId);
      socket.off('group_message', handleMsg);
    };
  }, [groupId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message: persist to backend, then emit
  const sendMessage = async e => {
    e.preventDefault();
    if (!input && !file) return;
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;
    if (!token) return;
    let msg = { groupId, userId: currentUserId, text: input, file: null };
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        msg = { ...msg, file: { name: file.name, data: reader.result } };
        try {
          const saved = await sendGroupMessage(groupId, msg, token);
          socket.emit('group_message', saved);
        } catch (err) {}
      };
      reader.readAsDataURL(file);
      setFile(null);
    } else {
      try {
        const saved = await sendGroupMessage(groupId, msg, token);
        socket.emit('group_message', saved);
      } catch (err) {}
    }
    setInput('');
  };

  // Helper: Get sender info from members array
  const getSenderInfo = (userId) => {
    const member = (Array.isArray(members) ? members : []).find(m => m.user?.id === userId || m.user_id === userId);
    return {
      username: member?.user?.username || member?.user_id || 'Unknown',
      avatar: member?.user?.avatar_url || '/default-avatar.png',
    };
  };

  // Call modal state
  const [callModal, setCallModal] = useState({ open: false, targetUser: null, video: false });
  // List of other group members (not self)
  const otherMembers = (Array.isArray(members) ? members : []).filter(m => (m.user?.id || m.user_id) !== currentUserId);
  // Helper: Get sender info from members array (already defined)

  return (
    <>
      <div className="group-chat" style={{ maxWidth: 700, margin: '0 auto', background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.07)', padding: 0 }}>
        <div className="chat-messages" style={{ maxHeight: 400, overflowY: 'auto', padding: '24px 18px 12px 18px', background: '#f8fafd', borderRadius: '12px 12px 0 0' }}>
          {/* Messenger-style grouped chat bubbles */}
        {(() => {
          // Helper: group consecutive messages by sender
          const groups = [];
          let lastSender = null, lastGroup = null;
          messages.forEach((msg, i) => {
            if (!lastGroup || msg.userId !== lastSender) {
              lastGroup = { senderId: msg.userId, messages: [], sender: getSenderInfo(msg.userId), firstIndex: i, timestamp: msg.timestamp };
              groups.push(lastGroup);
              lastSender = msg.userId;
            }
            lastGroup.messages.push(msg);
          });
          return groups.map((group, gi) => (
            <div
              key={gi + '-' + group.senderId}
              className={
                'chat-message-group' +
                (group.senderId === currentUserId ? ' chat-message-group-own' : '')
              }
            >
              <div className="chat-message-group-header">
                <img
                  className="chat-avatar"
                  src={group.sender.avatar}
                  alt={group.sender.username}
                />
                <div className="chat-message-meta">
                  <span className="chat-message-username">{group.sender.username}</span>
                  <span className="chat-message-time">{group.messages[0].timestamp ? new Date(group.messages[0].timestamp).toLocaleTimeString() : ''}</span>
                </div>
              </div>
              <div className="chat-message-bubbles">
                {group.messages.map((msg, mi) => {
                  const isImage = msg.file && msg.file.data && msg.file.data.startsWith('data:image');
                  return (
                    <div
                      key={mi}
                      className={
                        'chat-bubble' +
                        (group.senderId === currentUserId ? ' chat-bubble-own' : '')
                      }
                    >
                      {msg.text && <span>{msg.text}</span>}
                      {msg.file && (
                        isImage ? (
                          <div style={{ marginTop: 6 }}>
                            <img src={msg.file.data} alt={msg.file.name} style={{ maxWidth: 180, maxHeight: 140, borderRadius: 6, border: '1px solid #eee', display: 'block' }} />
                            <a href={msg.file.data} download={msg.file.name} style={{ fontSize: 13, color: '#007bff', display: 'block', marginTop: 4 }}>Download Image</a>
                          </div>
                        ) : (
                          <div style={{ marginTop: 6 }}>
                            <a href={msg.file.data} download={msg.file.name} style={{ fontSize: 14, color: '#007bff' }}>File: {msg.file.name}</a>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ));
        })()}

          <div ref={messagesEndRef} />
        </div>
        <form className="chat-input-form" onSubmit={sendMessage} style={{ display: 'flex', gap: 10, padding: '16px 18px', borderTop: '1px solid #f0f0f0', background: '#f8fafd', borderRadius: '0 0 12px 12px' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Type a message..."
            style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', fontSize: 15 }}
          />
          <input
            type="file"
            onChange={e => setFile(e.target.files[0])}
            style={{ width: 120 }}
          />
          <button type="submit" style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 8, padding: '0 18px', fontWeight: 500, fontSize: 15 }}>Send</button>
        </form>
        {/* Call buttons for each member */}
        <div style={{ display: 'flex', gap: 10, margin: '18px 0 0 0', flexWrap: 'wrap', alignItems: 'center' }}>
          {otherMembers.map(m => (
            <div key={m.user?.id || m.user_id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={m.user?.avatar_url || '/default-avatar.png'} alt={m.user?.username || m.user_id} style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #bbb' }} />
              <span style={{ color: '#222', fontWeight: 500 }}>{m.user?.username || m.user_id}</span>
              <button onClick={() => setCallModal({ open: true, targetUser: m.user?.id || m.user_id, video: false })} style={{ background: '#27ae60', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', marginLeft: 4, fontSize: 14, cursor: 'pointer' }}>Call</button>
              <button onClick={() => setCallModal({ open: true, targetUser: m.user?.id || m.user_id, video: true })} style={{ background: '#007bff', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', marginLeft: 4, fontSize: 14, cursor: 'pointer' }}>Video</button>
            </div>
          ))}
        </div>
      </div>
      {/* Call Modal */}
      <GroupCallModal
        isOpen={callModal.open}
        onClose={() => setCallModal({ open: false, targetUser: null, video: false })}
        targetUser={callModal.targetUser}
        currentUserId={currentUserId}
        video={callModal.video}
        groupId={groupId}
      />
    </>
  );
}

// Create Project Modal Component
const CreateProjectModal = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    priority: 'medium',
    color: '#007bff',
    due_date: '',
    github_repo: '',
    design_files: [],
    resources: {}
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error('Project name is required');
      return;
    }
    onSubmit(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Create New Project</h2>
          <button className="modal-close" onClick={onClose}>&times;</button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <div className="form-group">
            <label>Project Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Enter project name..."
              required
            />
          </div>
          
          <div className="form-group">
            <label>Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Describe your project..."
              rows="3"
            />
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Priority</label>
              <select name="priority" value={formData.priority} onChange={handleChange}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div className="form-group">
              <label>Color</label>
              <input
                type="color"
                name="color"
                value={formData.color}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Due Date</label>
            <input
              type="date"
              name="due_date"
              value={formData.due_date}
              onChange={handleChange}
            />
          </div>
          
          <div className="form-group">
            <label>GitHub Repository (Optional)</label>
            <input
              type="url"
              name="github_repo"
              value={formData.github_repo}
              onChange={handleChange}
              placeholder="https://github.com/username/repo"
            />
          </div>
          
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Group;

