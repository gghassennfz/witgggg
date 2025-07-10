import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { supabase } from '../supabaseClient';
import './CreateGroup.css'; // Import the new dedicated CSS file

const CreateGroup = () => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false); // New state

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
      console.log('[CreateGroup] user:', user);
      if (!user || !user.id || typeof user.id !== 'string' || user.id.length < 10) {
        toast.error('Invalid user ID. Please log in again.');
        setLoading(false);
        return;
      }
      let insertData = { name, description, created_by: user.id, is_private: isPrivate };
      let newGroup, error;
      try {
        ({ data: newGroup, error } = await supabase
          .from('groups')
          .insert([insertData])
          .select()
          .single());
      } catch (err) {
        error = err;
      }
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
            <label style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <input
                type="checkbox"
                checked={isPrivate}
                onChange={e => setIsPrivate(e.target.checked)}
                style={{marginRight:8}}
              />
              Private Group (Personal Workspace)
            </label>
            <div style={{fontSize:'0.93em',color:'#888',marginTop:4}}>
              Only you can access a private group. For teams, leave this unchecked.
            </div>
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
