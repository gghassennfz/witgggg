import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { supabase } from '../supabaseClient';
import './Mates.css';
import API_BASE_URL from '../apiConfig';

const Mates = () => {
    const [myProfile, setMyProfile] = useState(null);
    const [mates, setMates] = useState([]);
    const [requestCode, setRequestCode] = useState('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState('');

    const fetchUserData = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');
            const token = session.access_token;

            // Fetch profile and mates data in parallel
            const [profileRes, matesRes] = await Promise.all([
                                fetch(`${API_BASE_URL}/api/profile`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${API_BASE_URL}/api/mates`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!profileRes.ok || !matesRes.ok) {
                throw new Error('Failed to fetch user data.');
            }

            const profileData = await profileRes.json();
            const matesData = await matesRes.json();

            setMyProfile(profileData);
            setMates(matesData);
            setError('');
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUserData();
    }, []);

    const handleSendRequest = async (e) => {
        e.preventDefault();
        if (!requestCode) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session.access_token;

            const res = await fetch(`${API_BASE_URL}/api/mates/request`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ user_code: requestCode })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to send request.');

            setNotification('Mate request sent successfully!');
            setRequestCode('');
            fetchUserData(); // Refresh data
        } catch (err) {
            setError(err.message);
        }
    };

    const handleUpdateRequest = async (requestId, status) => {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session.access_token;

            const res = await fetch(`${API_BASE_URL}/api/mates/request/${requestId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ status })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to update request.');

            setNotification(`Request ${status}.`);
            fetchUserData(); // Refresh data
        } catch (err) {
            setError(err.message);
        }
    };

    if (loading) return <div>Loading...</div>;

    const acceptedMates = mates.filter(m => m.status === 'accepted');
    const pendingMates = mates.filter(m => m.status === 'pending');

    return (
        <>
            <Helmet>
                <title>My Mates - WitG</title>
            </Helmet>
            <div className="mates-container">
                <header className="mates-header">
                    <h1>My Mates</h1>
                    {myProfile && (
                        <div className="my-code-section">
                            <span>Your Unique Code:</span>
                            <strong className="user-code">#{myProfile.user_code}</strong>
                        </div>
                    )}
                </header>

                {error && <div className="error-message">{error}</div>}
                {notification && <div className="notification-message">{notification}</div>}

                <div className="mates-content">
                    <div className="mates-main">
                        <h2>Add a Mate</h2>
                        <form onSubmit={handleSendRequest} className="add-mate-form">
                            <input
                                type="text"
                                value={requestCode}
                                onChange={(e) => setRequestCode(e.target.value)}
                                placeholder="Enter a mate's 6-digit code"
                                maxLength="6"
                            />
                            <button type="submit">Send Request</button>
                        </form>

                        <h2>Mates ({acceptedMates.length})</h2>
                        <div className="mates-list">
                            {acceptedMates.length > 0 ? (
                                acceptedMates.map(mate => (
                                    <div key={mate.requestId} className="mate-card">
                                        <img src={mate.mateInfo.avatar_url || '/default-avatar.png'} alt="avatar" className="avatar" />
                                        <div className="mate-details">
                                            <strong>{mate.mateInfo.full_name || mate.mateInfo.username}</strong>
                                            <span>#{mate.mateInfo.user_code}</span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <p>You haven't added any mates yet.</p>
                            )}
                        </div>
                    </div>

                    <aside className="mates-sidebar">
                        <h2>Pending Requests ({pendingMates.length})</h2>
                        <div className="pending-list">
                            {pendingMates.length > 0 ? (
                                pendingMates.map(mate => (
                                    <div key={mate.requestId} className="pending-card">
                                        <div className="pending-info">
                                            <strong>{mate.mateInfo.full_name || mate.mateInfo.username}</strong>
                                            <span>wants to be your mate.</span>
                                        </div>
                                        {!mate.isSender && (
                                            <div className="pending-actions">
                                                <button onClick={() => handleUpdateRequest(mate.requestId, 'accepted')} className="accept-btn">Accept</button>
                                                <button onClick={() => handleUpdateRequest(mate.requestId, 'declined')} className="decline-btn">Decline</button>
                                            </div>
                                        )}
                                        {mate.isSender && <span className='request-sent-label'>Request Sent</span>}
                                    </div>
                                ))
                            ) : (
                                <p>No pending requests.</p>
                            )}
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
};

export default Mates;
