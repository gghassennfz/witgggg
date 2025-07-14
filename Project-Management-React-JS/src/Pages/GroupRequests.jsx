import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import './Group.css';

const GroupRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not found');
        // Find all groups where the current user is in members with status 'pending'
        const { data, error } = await supabase
          .from('groups')
          .select('*')
          .filter('members', 'cs', JSON.stringify([{ user_id: user.id, status: 'pending' }]));
        if (error) throw error;
        setRequests(data || []);
      } catch (err) {
        toast.error(err.message || 'Failed to fetch requests.');
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, []);

  const handleAccept = async (groupId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Fetch current members array
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('members')
        .eq('id', groupId)
        .single();
      if (groupError) throw groupError;
      const currentMembers = groupData.members || [];
      const updatedMembers = currentMembers.map(m =>
        m.user_id === user.id ? { ...m, status: 'accepted' } : m
      );
      const { error: updateError } = await supabase
        .from('groups')
        .update({ members: updatedMembers })
        .eq('id', groupId);
      if (updateError) throw updateError;
      toast.success('Invitation accepted!');
      setRequests(requests.filter(g => g.id !== groupId));
    } catch (err) {
      toast.error('Error accepting invite: ' + (err.message || err));
    }
  };

  const handleCancel = async (groupId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Remove the user from the members array
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('members')
        .eq('id', groupId)
        .single();
      if (groupError) throw groupError;
      const currentMembers = groupData.members || [];
      const updatedMembers = currentMembers.filter(m => m.user_id !== user.id);
      const { error: updateError } = await supabase
        .from('groups')
        .update({ members: updatedMembers })
        .eq('id', groupId);
      if (updateError) throw updateError;
      toast.success('Invitation canceled.');
      setRequests(requests.filter(g => g.id !== groupId));
    } catch (err) {
      toast.error('Error canceling invite: ' + (err.message || err));
    }
  };

  return (
    <div className="page-container group-requests-page">
      <Helmet>
        <title>Join Requests - WitG</title>
      </Helmet>
      <h1 style={{ color: '#222', margin: '32px 0 24px 0' }}>Join Group Requests</h1>
      {loading ? (
        <p>Loading requests...</p>
      ) : requests.length > 0 ? (
        <ul className="member-list" style={{ maxWidth: 520, margin: '0 auto' }}>
          {requests.map(group => (
            <li className="member-row" key={group.id}>
              <span style={{ color: '#222', fontWeight: 500 }}>{group.name}</span>
              <span style={{ color: '#888', marginLeft: 12 }}>{group.description}</span>
              <button className="remove-btn" style={{ background: '#27ae60', marginLeft: 18 }} onClick={() => handleAccept(group.id)}>Accept</button>
              <button className="remove-btn" style={{ background: '#e74c3c', marginLeft: 10 }} onClick={() => handleCancel(group.id)}>Cancel</button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="empty-state">
          <h2>No join requests!</h2>
          <p>You have no pending invitations to join groups.</p>
        </div>
      )}
    </div>
  );
};

export default GroupRequests;
