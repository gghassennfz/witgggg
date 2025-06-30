import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Header.css';
import API_BASE_URL from '../apiConfig';

const Header = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // No active session, no need to fetch profile
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Could not load profile.');
        }

        const profileData = await response.json();
        setProfile(profileData);
      } catch (error) {
        console.error('Error fetching profile for header:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const defaultAvatar = 'https://i.pravatar.cc/40';

  return (
    <header className="header">
      <div className="header-search">
        <i className="uil uil-search"></i>
        <input type="text" placeholder="Search for projects, tasks..." />
      </div>
      <Link to="/settings" className="header-user-link">
        <div className="header-user">
          {loading ? (
            <div className="user-info">
              <span className="user-name">Loading...</span>
            </div>
          ) : profile ? (
            <>
              <div className="user-info">
                <span className="user-name">{profile.username || 'User'}</span>
                {/* The user-role span is removed as requested */}
              </div>
              <img 
                src={profile.avatar_url || defaultAvatar} 
                alt="User Avatar" 
                className="user-avatar" 
              />
            </>
          ) : (
            <>
              <div className="user-info">
                <span className="user-name">Guest</span>
              </div>
              <img src={defaultAvatar} alt="Default Avatar" className="user-avatar" />
            </>
          )}
        </div>
      </Link>
    </header>
  );
}

export default Header;
