import React, { useState, useEffect } from "react"
import { Helmet } from "react-helmet-async"
import { supabase } from "../supabaseClient"
import "./Mates.css"
import API_BASE_URL from "../apiConfig"

const Mates = () => {
  const [myProfile, setMyProfile] = useState(null)
  const [mates, setMates] = useState([])
  const [mateQuery, setMateQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [notification, setNotification] = useState("")

  const fetchUserData = async () => {
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
  }

  useEffect(() => {
    fetchUserData()
  }, [])

  const handleSendRequest = async e => {
    e.preventDefault()
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
      setMateQuery("")
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

  if (loading) return <div>Loading...</div>

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
              <input type="text" value={mateQuery} onChange={e => setMateQuery(e.target.value)} placeholder="Enter a mate's email, username, or code" />
              <button type="submit">Send Request</button>
            </form>

            <h2>Mates ({mates.length})</h2>
            <div className="mates-list">
              {mates.length > 0 ? (
                mates.map(mate => (
                  <div key={mate.requestId || mate.id || mate.mateInfo?.id} className="mate-card">
                    <img src={mate.mateInfo?.avatar_url || mate.avatar_url || "/default-avatar.png"} alt="avatar" className="avatar" />
                    <div className="mate-details">
                      <strong>{mate.mateInfo?.full_name || mate.mateInfo?.username || mate.username}</strong>
                      <span>#{mate.mateInfo?.user_code || mate.code}</span>
                    </div>
                  </div>
                ))
              ) : (
                <p>You haven&apos;t added any mates yet.</p>
              )}
            </div>
          </div>

          <aside className="mates-sidebar">
            <h2>Pending Requests</h2>
            <PendingRequestsSection myProfile={myProfile} fetchUserData={fetchUserData} setError={setError} setNotification={setNotification} />
          </aside>
        </div>
      </div>
    </>
  )
}

// --- Pending Requests Section ---
function PendingRequestsSection({ myProfile, fetchUserData, setError, setNotification }) {
  const [pendingReceived, setPendingReceived] = useState([])
  const [pendingSent, setPendingSent] = useState([])
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
        setPendingReceived(data.received || [])
        setPendingSent(data.sent || [])
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

  if (loading) return <div>Loading pending requests...</div>

  return (
    <div className="pending-list">
      <div className="pending-section">
        <h3>Incoming</h3>
        {pendingReceived.length > 0 ? (
          pendingReceived.map(req => (
            <div key={req.sender} className="pending-card">
              <div className="pending-info">
                <strong>{req.from?.username || req.from_user_id}</strong>
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
        {pendingSent.length > 0 ? (
          pendingSent.map(req => (
            <div key={req.receiver} className="pending-card">
              <div className="pending-info">
                <span>
                  To: <strong>{req.to?.username || req.to_user_id}</strong>
                </span>
                <span className="request-sent-label">Request Sent</span>
              </div>
              <div className="pending-actions">
                <button onClick={() => handleRespond(`${req.sender}_${req.receiver}_${req.created_at}`, "reject")} className="decline-btn">
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
