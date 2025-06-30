import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';
import './PersonalWorkspace.css';
import API_BASE_URL from '../apiConfig';

const PersonalWorkspace = () => {
    const [assets, setAssets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newAsset, setNewAsset] = useState({ title: '', content: '' });

    const fetchAssets = async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const response = await fetch(`${API_BASE_URL}/api/personal-assets`, {
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                },
            });

            if (!response.ok) throw new Error('Failed to fetch assets');

            const data = await response.json();
            setAssets(data);
        } catch (error) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAssets();
    }, []);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewAsset(prev => ({ ...prev, [name]: value }));
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!newAsset.title) {
            toast.warn('Title is required to add a note.');
            return;
        }

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const response = await fetch(`${API_BASE_URL}/api/personal-assets`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({ ...newAsset, asset_type: 'note' }),
            });

            if (!response.ok) throw new Error('Failed to add note');

            toast.success('Note added successfully!');
            setNewAsset({ title: '', content: '' });
            fetchAssets(); // Refresh asset list
        } catch (error) {
            toast.error(error.message);
        }
    };

    if (loading) {
        return <div>Loading your personal workspace...</div>;
    }

    return (
        <div className="personal-workspace">
            <h1>My Personal Workspace</h1>
            <p>A private space to save your notes, files, and ideas.</p>

            <div className="workspace-content">
                <div className="asset-list">
                    <h2>My Saved Notes</h2>
                    {assets.filter(a => a.asset_type === 'note').length > 0 ? (
                        assets.filter(a => a.asset_type === 'note').map(asset => (
                            <div key={asset.id} className="asset-item">
                                <h3>{asset.title}</h3>
                                <p>{asset.content}</p>
                                <small>Saved on: {new Date(asset.created_at).toLocaleDateString()}</small>
                            </div>
                        ))
                    ) : (
                        <p>You haven't saved any notes yet.</p>
                    )}
                </div>

                <div className="add-asset-form">
                    <h2>Add a New Note</h2>
                    <form onSubmit={handleAddNote}>
                        <input
                            type="text"
                            name="title"
                            placeholder="Note Title"
                            value={newAsset.title}
                            onChange={handleInputChange}
                        />
                        <textarea
                            name="content"
                            placeholder="What's on your mind?"
                            rows="6"
                            value={newAsset.content}
                            onChange={handleInputChange}
                        ></textarea>
                        <button type="submit">Save Note</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PersonalWorkspace;
