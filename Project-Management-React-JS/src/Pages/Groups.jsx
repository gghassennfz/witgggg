import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import '../styles/design-system.css';
import './Groups.css';

const Groups = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserGroups = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');

        // Fetch groups where the current user's ID is in members array with status 'accepted'
        const { data: groupData, error: groupError } = await supabase
          .from('groups')
          .select('*')
          .filter(
            'members',
            'cs',
            JSON.stringify([{ user_id: user.id, status: 'accepted' }])
          );

        if (groupError) throw groupError;
        setGroups(groupData || []);

      } catch (err) {
        toast.error(err.message || 'Failed to fetch groups.');
        console.error('Error fetching groups:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserGroups();
  }, []);

  return (
    <div className="page-container groups-page">
      <Helmet>
        <title>My Groups - WitG</title>
      </Helmet>

      <div className="page-hero">
        <div className="hero-content">
          <div className="hero-text">
            <h1 className="page-title">
              <span className="title-icon">👥</span>
              My Groups
            </h1>
            <p className="page-subtitle">
              Collaborate with your teams and manage projects together
            </p>
          </div>
          <div className="hero-actions">
            <Link to="/group/requests" className="btn btn-outline">
              <span className="btn-icon">📨</span>
              Join Requests
            </Link>
            <Link to="/group/create" className="btn btn-primary">
              <span className="btn-icon">➕</span>
              Create New Group
            </Link>
          </div>
        </div>
        
        <div className="hero-stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-content">
              <span className="stat-number">{groups.length}</span>
              <span className="stat-label">Active Groups</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <span className="stat-number">{groups.reduce((acc, group) => acc + (group.members?.length || 0), 0)}</span>
              <span className="stat-label">Total Members</span>
            </div>
          </div>
        </div>
      </div>

      <div className="groups-content">
        {loading ? (
          <div className="loading-state">
            <div className="loading-spinner"></div>
            <p className="loading-text">Loading your groups...</p>
          </div>
        ) : groups.length > 0 ? (
          <>
            <div className="content-header">
              <h2 className="section-title">Your Groups</h2>
              <div className="view-options">
                <button className="view-btn active">
                  <i className="uil uil-apps"></i>
                </button>
                <button className="view-btn">
                  <i className="uil uil-list-ul"></i>
                </button>
              </div>
            </div>
            
            <div className="groups-grid">
              {groups.map(group => (
                <Link to={`/group/${group.id}`} key={group.id} className="group-card">
                  <div className="card-header">
                    <div className="group-avatar">
                      {group.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="group-status online"></div>
                  </div>
                  
                  <div className="card-content">
                    <h3 className="group-name">{group.name}</h3>
                    <p className="group-description">
                      {group.description || 'No description available'}
                    </p>
                  </div>
                  
                  <div className="card-footer">
                    <div className="group-members">
                      <div className="members-avatars">
                        {group.members?.slice(0, 3).map((member, index) => (
                          <div key={index} className="member-avatar">
                            {member.username?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        ))}
                        {group.members?.length > 3 && (
                          <div className="member-count">+{group.members.length - 3}</div>
                        )}
                      </div>
                      <span className="members-text">
                        {group.members?.length || 0} members
                      </span>
                    </div>
                    
                    <div className="group-activity">
                      <span className="activity-indicator"></span>
                      <span className="activity-text">Active</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="empty-icon">🎆</div>
            <h2 className="empty-title">Ready to collaborate?</h2>
            <p className="empty-description">
              You haven't joined or created any groups yet. Start building amazing projects with your team!
            </p>
            <div className="empty-actions">
              <Link to="/group/create" className="btn btn-primary">
                <span className="btn-icon">✨</span>
                Create Your First Group
              </Link>
              <Link to="/group/requests" className="btn btn-outline">
                <span className="btn-icon">🔍</span>
                Browse Join Requests
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Groups;
