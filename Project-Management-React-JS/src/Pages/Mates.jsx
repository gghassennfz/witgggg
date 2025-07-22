import { useState, useEffect, useRef, useCallback } from "react"
import { Helmet } from "react-helmet-async"
import { supabase } from "../supabaseClient"
import "../styles/design-system.css"
import "./Mates.css"
import API_BASE_URL from "../apiConfig"

const Mates = () => {
  const [myProfile, setMyProfile] = useState(null)
  const [mates, setMates] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notification, setNotification] = useState("")
  const searchRef = useRef(null)

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true)
      const {
        data: { session }
      } = await supabase.auth.getSession()

      if (!session) throw new Error("Not authenticated")
      const token = session.access_token

      // Fetch profile and mates data in parallel
      const [profileRes, matesRes] = await Promise.all([fetch(`${API_BASE_URL}/api/profile`, { headers: { Authorization: `Bearer ${token}` } }), fetch(`${API_BASE_URL}/api/mates`, { headers: { Authorization: `Bearer ${token}` } })])

      if (!profileRes.ok || !matesRes.ok) {
        throw new Error("Failed to fetch user data.")
      }

      const profileData = await profileRes.json()
      const matesData = await matesRes.json()

      setMyProfile(profileData)
      setMates(matesData.mates || [])
      setError("")
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchUserData()
  }, [fetchUserData])

  const handleSendRequest = async e => {
    e.preventDefault()
    const formData = new FormData(searchRef.current)
    const mateQuery = formData.get("search").toLowerCase().trim()

    if (!mateQuery) return
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      const token = session.access_token

      const res = await fetch(`${API_BASE_URL}/api/mates/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ query: mateQuery })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send request.")

      setNotification("Mate request sent successfully!")
      searchRef.current.reset()
      fetchUserData() // Refresh data
    } catch (err) {
      setError(err.message)
    }
  }

  const handleUpdateRequest = async (requestId, status) => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      const token = session.access_token

      const res = await fetch(`${API_BASE_URL}/api/mates/request/${requestId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update request.")

      setNotification(`Request ${status}.`)
      fetchUserData() // Refresh data
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="mates-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your mates...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Helmet>
        <title>My Mates - WitG</title>
      </Helmet>

      <div className="mates-page">
        <div className="page-hero">
          <div className="hero-content">
            <h1 className="page-title">
              <span className="title-icon">👥</span>
              My Mates
            </h1>
            <p className="page-subtitle">Connect and collaborate with your team members</p>

            {myProfile && (
              <div className="user-code-card">
                <div className="code-header">
                  <span className="code-icon">🔗</span>
                  <span className="code-label">Your Unique Code</span>
                </div>
                <div className="code-value">#{myProfile.user_code}</div>
                <div className="code-description">Share this code with others to connect</div>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            <span className="alert-icon">⚠️</span>
            <span className="alert-message">{error}</span>
          </div>
        )}

        {notification && (
          <div className="alert alert-success">
            <span className="alert-icon">✅</span>
            <span className="alert-message">{notification}</span>
          </div>
        )}

        <div className="mates-container">
          <div className="mates-main">
            <div className="add-mate-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="section-icon">➕</span>
                  Add New Mate
                </h2>
                <p className="section-description">Send a connection request using email, username, or unique code</p>
              </div>

              <form onSubmit={handleSendRequest} className="add-mate-form" ref={searchRef}>
                <div className="form-group">
                  <div className="input-wrapper">
                    <input type="text" name="search" id="search" className="form-input" placeholder="Enter email, username, or #code" />
                    <button type="submit" className="btn btn-primary">
                      <span className="btn-icon">📤</span>
                      Send Request
                    </button>
                  </div>
                </div>
              </form>
            </div>

            <div className="mates-list-section">
              <div className="section-header">
                <h2 className="section-title">
                  <span className="section-icon">👥</span>
                  My Mates ({mates.length})
                </h2>
                <div className="mates-stats">
                  <div className="stat-item">
                    <span className="stat-value">{mates.length}</span>
                    <span className="stat-label">Connected</span>
                  </div>
                </div>
              </div>

              <div className="mates-grid">
                {mates.length > 0 ? (
                  mates.map(mate => (
                    <div key={mate.requestId || mate.id || mate.mateInfo?.id} className="mate-card">
                      <div className="mate-avatar">
                        <img src={mate.mateInfo?.avatar_url || mate.avatar_url || "https://i.pravatar.cc/60"} alt="avatar" className="avatar-image" />
                        <div className="status-indicator online"></div>
                      </div>

                      <div className="mate-info">
                        <h3 className="mate-name">{mate.mateInfo?.full_name || mate.mateInfo?.username || mate.username}</h3>
                        <p className="mate-code">#{mate.mateInfo?.code || mate.code}</p>
                        <div className="mate-actions">
                          <button className="action-btn message">
                            <span className="btn-icon">💬</span>
                            Message
                          </button>
                          <button className="action-btn profile">
                            <span className="btn-icon">👤</span>
                            Profile
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="empty-state">
                    <div className="empty-icon">👥</div>
                    <h3 className="empty-title">No mates yet</h3>
                    <p className="empty-description">Start building your network by adding your first mate above</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <aside className="mates-sidebar">
            <div className="sidebar-section">
              <div className="section-header">
                <h3 className="section-title">
                  <span className="section-icon">⏳</span>
                  Pending Requests
                </h3>
              </div>
              <PendingRequestsSection myProfile={myProfile} fetchUserData={fetchUserData} setError={setError} setNotification={setNotification} />
            </div>
          </aside>
        </div>
      </div>
    </>
  )
}

// --- Pending Requests Section ---
function PendingRequestsSection({ fetchUserData, setError, setNotification }) {
  const [pendingRequests, setPendingRequests] = useState({
    received: [],
    sent: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchPending = async () => {
      try {
        setLoading(true)
        const {
          data: { session }
        } = await supabase.auth.getSession()
        const token = session.access_token
        const res = await fetch(`${API_BASE_URL}/api/mates/requests`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to fetch requests.")
        setPendingRequests({ received: data.received || [], sent: data.sent || [] })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPending()
  }, [fetchUserData, setError])

  const handleRespond = async (requestId, action) => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      const token = session.access_token
      const res = await fetch(`${API_BASE_URL}/api/mates/requests/${requestId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ action })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update request.")
      setNotification(`Request ${action === "accept" ? "accepted" : "declined"}.`)
      fetchUserData()
    } catch (err) {
      setError(err.message)
    }
  }

  const handleCancel = async requestId => {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession()
      const token = session.access_token
      const res = await fetch(`${API_BASE_URL}/api/mates/requests/${requestId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update request.")
      setNotification(`Request cancelled`)
      fetchUserData()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) return <div>Loading pending requests...</div>

  return (
    <div className="pending-list">
      <div className="pending-section">
        <h3>Incoming</h3>
        {pendingRequests.received.length > 0 ? (
          pendingRequests.received.map(req => (
            <div key={req.sender.id} className="pending-card">
              <div className="pending-info">
                <strong>{req.sender?.username || req.from_user_id}</strong>
                <span>wants to be your mate.</span>
              </div>
              <div className="pending-actions">
                <button onClick={() => handleRespond(req.id, "accept")} className="accept-btn">
                  Accept
                </button>
                <button onClick={() => handleRespond(req.id, "reject")} className="decline-btn">
                  Decline
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No incoming requests.</p>
        )}
      </div>
      <div className="pending-section">
        <h3>Outgoing</h3>
        {pendingRequests.sent.length > 0 ? (
          pendingRequests.sent.map(req => (
            <div key={req.receiver.id} className="pending-card">
              <div className="pending-info">
                <span>
                  To: <strong>{req.receiver?.username || req.to_user_id}</strong>
                </span>
                <span className="request-sent-label">Request Sent</span>
              </div>
              <div className="pending-actions">
                <button onClick={() => handleCancel(req.id)} className="decline-btn">
                  Cancel
                </button>
              </div>
            </div>
          ))
        ) : (
          <p>No outgoing requests.</p>
        )}
      </div>
    </div>
  )
}

export default Mates
