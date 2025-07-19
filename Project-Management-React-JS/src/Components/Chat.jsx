import React, { useEffect, useState, useRef } from "react"
import socket from "../socket"

import { fetchUsers } from "../api/users"
import { fetchGroups } from "../api/groups"

export default function Chat({ currentUserId }) {
  const [users, setUsers] = useState([])
  const [groups, setGroups] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState("")
  const [selectedUser, setSelectedUser] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [typing, setTyping] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const typingTimeout = useRef(null)

  // Load users and groups from backend
  useEffect(() => {
    fetchUsers().then(setUsers).catch(console.error)
    fetchGroups().then(setGroups).catch(console.error)
  }, [])

  // Connect and join
  useEffect(() => {
    if (!currentUserId) return
    socket.connect()
    socket.emit("join", currentUserId)
    // Use fetched groups, or fallback to demo groups if empty
    const fallbackGroups = groups.length ? groups : [{ id: "demo-group-1", name: "Demo Group" }]
    fallbackGroups.forEach(g => socket.emit("join_group", g.id))
    return () => {
      socket.disconnect()
    }
  }, [currentUserId])

  // Event listeners
  useEffect(() => {
    socket.on("presence", setOnlineUsers)
    socket.on("receive_message", msg => {
      setMessages(prev => [...prev, msg])
    })
    socket.on("typing", data => {
      setTypingUsers(prev => {
        if (!prev.includes(data.from)) return [...prev, data.from]
        return prev
      })
      setTimeout(() => {
        setTypingUsers(prev => prev.filter(u => u !== data.from))
      }, 2000)
    })
    return () => {
      socket.off("presence")
      socket.off("receive_message")
      socket.off("typing")
    }
  }, [])

  // Send message
  const sendMessage = () => {
    if (!input) return
    const data = {
      from: currentUserId,
      message: input,
      to: selectedUser,
      groupId: selectedGroup
    }
    socket.emit("send_message", data)
    setMessages(prev => [...prev, data])
    setInput("")
  }

  // Typing indicator
  const handleInput = e => {
    setInput(e.target.value)
    if (!typing) {
      setTyping(true)
      socket.emit("typing", {
        from: currentUserId,
        to: selectedUser,
        groupId: selectedGroup
      })
      typingTimeout.current = setTimeout(() => setTyping(false), 1500)
    } else {
      clearTimeout(typingTimeout.current)
      typingTimeout.current = setTimeout(() => setTyping(false), 1500)
    }
  }

  // Select user/group
  const selectUser = async userId => {
    setSelectedUser(userId)
    setSelectedGroup(null)
    setMessages([])
    // Fetch direct chat history
    try {
      const res = await fetch(`/api/chat/history?userA=${currentUserId}&userB=${userId}`)
      const data = await res.json()
      setMessages(data)
    } catch (err) {
      console.error("Failed to fetch chat history:", err)
    }
  }
  const selectGroup = async groupId => {
    setSelectedGroup(groupId)
    setSelectedUser(null)
    setMessages([])
    // Fetch group chat history
    try {
      const res = await fetch(`/api/chat/history?groupId=${groupId}`)
      const data = await res.json()
      setMessages(data)
    } catch (err) {
      console.error("Failed to fetch group chat history:", err)
    }
  }

  // Filter messages for current chat
  const filteredMessages = messages.filter(m => {
    if (selectedGroup) return m.group_id === selectedGroup
    if (selectedUser) return (m.to === currentUserId && m.from === selectedUser) || (m.from === currentUserId && m.to === selectedUser)
    return false
  })

  return (
    <div style={{ display: "flex", height: 400, border: "1px solid #ccc" }}>
      <div style={{ width: 150, borderRight: "1px solid #ccc", padding: 8 }}>
        <h4>Users</h4>
        {users
          .filter(u => u.id !== currentUserId)
          .map(u => (
            <div key={u.id} style={{ cursor: "pointer", fontWeight: onlineUsers.includes(u.id) ? "bold" : "normal" }} onClick={() => selectUser(u.id)}>
              {u.username || u.email || u.id} {onlineUsers.includes(u.id) ? "🟢" : "⚪"}
              {typingUsers.includes(u.id) && " ✍️"}
            </div>
          ))}
        <h4>Groups</h4>
        {groups.map(g => (
          <div key={g.id} style={{ cursor: "pointer", fontWeight: selectedGroup === g.id ? "bold" : "normal" }} onClick={() => selectGroup(g.id)}>
            {g.name || g.id}
          </div>
        ))}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, padding: 8, overflowY: "auto", background: "#fafafa" }}>
          {filteredMessages.map((m, i) => (
            <div key={i} style={{ textAlign: m.from === currentUserId ? "right" : "left", margin: 4 }}>
              <span style={{ background: m.from === currentUserId ? "#d1f7c4" : "#eee", borderRadius: 4, padding: 4 }}>{m.message}</span>
            </div>
          ))}
        </div>
        <div style={{ padding: 8, borderTop: "1px solid #ccc" }}>
          <input type="text" value={input} onChange={handleInput} style={{ width: "70%" }} placeholder="Type a message..." />
          <button onClick={sendMessage} style={{ marginLeft: 8 }}>
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
