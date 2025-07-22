import React, { useState, useEffect } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../supabaseClient"
import "../styles/design-system.css"
import "./Header.css"
import API_BASE_URL from "../apiConfig"

const Header = () => {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const {
          data: { session }
        } = await supabase.auth.getSession()
        if (!session) {
          // No active session, no need to fetch profile
          setLoading(false)
          return
        }

        const response = await fetch(`${API_BASE_URL}/api/profile`, {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        })

        if (!response.ok) {
          throw new Error("Could not load profile.")
        }

        const profileData = await response.json()
        setProfile(profileData)
      } catch (error) {
        console.error("Error fetching profile for header:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const defaultAvatar = "https://i.pravatar.cc/40"

  return (
    <header className="header">
      <div className="header-brand">
        <Link to="/dashboard" className="brand-link">
          <div className="brand-icon">🚀</div>
          <span className="brand-text">WitG</span>
        </Link>
      </div>

      <div className="header-search">
        <div className="search-container">
          <i className="search-icon uil uil-search"></i>
          <input type="text" placeholder="Search projects, tasks, groups..." className="search-input" />
          <div className="search-shortcut">⌘K</div>
        </div>
      </div>

      <div className="header-actions">
        <button className="action-btn notification-btn">
          <i className="uil uil-bell"></i>
          <span className="notification-badge">3</span>
        </button>

        <button className="action-btn theme-toggle">
          <i className="uil uil-moon"></i>
        </button>

        <Link to="/settings" className="header-user-link">
          <div className="header-user">
            {loading ? (
              <div className="user-skeleton">
                <div className="skeleton-avatar"></div>
                <div className="skeleton-text"></div>
              </div>
            ) : profile ? (
              <>
                <div className="user-info">
                  <span className="user-name">{profile.username || "User"}</span>
                  <span className="user-status">Online</span>
                </div>
                <div className="user-avatar-container">
                  <img src={profile.avatar_url || defaultAvatar} alt="User Avatar" className="user-avatar" />
                  <div className="status-indicator"></div>
                </div>
              </>
            ) : (
              <>
                <div className="user-info">
                  <span className="user-name">Guest</span>
                  <span className="user-status">Offline</span>
                </div>
                <div className="user-avatar-container">
                  <img src={defaultAvatar} alt="Default Avatar" className="user-avatar" />
                  <div className="status-indicator offline"></div>
                </div>
              </>
            )}
          </div>
        </Link>
      </div>
    </header>
  )
}

export default Header
