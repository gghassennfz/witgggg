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

        // Fetch the group_ids the user is a member of
        const { data: memberEntries, error: memberError } = await supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id);

        if (memberError) throw memberError;

        const groupIds = memberEntries.map(entry => entry.group_id);

        if (groupIds.length > 0) {
            // Fetch the details of those groups
            const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .in('id', groupIds);

            if (groupError) throw groupError;
            setGroups(groupData);
        } else {
            setGroups([]);
        }

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

      <header className="page-header">
        <h1>My Groups</h1>
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
