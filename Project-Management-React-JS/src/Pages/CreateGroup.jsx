import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import './CreateGroup.css'; // Import the new dedicated CSS file

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [privacy, setPrivacy] = useState('private');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name) {
      toast.error('Group name is required.');
      return;
    }
    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      toast.error('You must be logged in to create a group.');
      setLoading(false);
      return;
    }

    try {
      const { data: newGroup, error } = await supabase
        .from('groups')
        .insert([{ name, description, privacy, created_by: user.id }])
        .select()
        .single();

      if (error) throw error;

      const { error: memberError } = await supabase
        .from('group_members')
        .insert([{ group_id: newGroup.id, user_id: user.id, role: 'leader' }]);

      if (memberError) throw memberError;

      toast.success(`Group '${name}' created successfully!`);
      navigate(`/group/${newGroup.id}`);
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error(error.message || 'Failed to create group.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-group-page">
      <Helmet>
        <title>Create New Group - WitG</title>
      </Helmet>
      <div className="create-group-container">
        <div className="create-group-header">
          <h1>Create a New Group</h1>
          <p>Start a new collaboration space for your team or project.</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="group-name">Group Name</label>
            <input
              id="group-name"
              type="text"
              className="input-field"
              placeholder="e.g., Q4 Marketing Campaign"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description (Optional)</label>
            <textarea
              id="description"
              className="textarea-field"
              placeholder="What is this group about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label htmlFor="privacy">Privacy</label>
            <select id="privacy" className="select-field" value={privacy} onChange={(e) => setPrivacy(e.target.value)}>
              <option value="private">Private (Only members can see)</option>
              <option value="invite-only">Invite-Only (Visible, but requires invite)</option>
              <option value="public">Public (Visible to everyone)</option>
            </select>
            <p className="input-hint">Note: Privacy settings are not yet implemented in the backend.</p>
          </div>
          <button type="submit" className="create-group-button" disabled={loading}>
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CreateGroup;
