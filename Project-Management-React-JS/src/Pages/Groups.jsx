import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
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

      <header className="page-header" style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <h1 style={{ marginRight: 'auto' }}>My Groups</h1>
        <Link to="/group/requests" className="btn btn-secondary" style={{ background: '#f1f5fa', color: '#007bff', border: '1px solid #cce2ff', padding: '8px 16px', borderRadius: '6px', fontWeight: 500, marginRight: 8 }}>
          See Join Requests
        </Link>
        <Link to="/group/create" className="btn btn-primary">
          + Create New Group
        </Link>
      </header>

      {loading ? (
        <p>Loading groups...</p>
      ) : groups.length > 0 ? (
        <div className="groups-grid">
          {groups.map(group => (
            <Link to={`/group/${group.id}`} key={group.id} className="group-card">
              <h3>{group.name}</h3>
              <p>{group.description || 'No description'}</p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <h2>No groups yet!</h2>
          <p>You haven't joined or created any groups. Get started by creating one.</p>
        </div>
      )}
    </div>
  );
};

export default Groups;
