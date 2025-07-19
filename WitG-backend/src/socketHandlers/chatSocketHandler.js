const supabase = require("../supabaseClient")

class ChatSocketHandler {
  constructor(io) {
    this.io = io
    this.connectedUsers = new Map() // userId -> socketId
    this.typingUsers = new Map() // chatId -> Set of userIds
    this.activeCalls = new Map() // callId -> call data
  }

  handleConnection(socket) {
    console.log("User connected:", socket.id)

    // User joins with their ID
    socket.on("join_chat_system", async userId => {
      try {
        socket.userId = userId
        this.connectedUsers.set(userId, socket.id)

        // Join user to all their chat rooms
        const { data: chats } = await supabase.from("chat_participants").select("chat_id").eq("user_id", userId)

        if (chats) {
          chats.forEach(({ chat_id }) => {
            socket.join(`chat_${chat_id}`)
          })
        }

        // Broadcast user online status
        this.broadcastUserStatus(userId, "online")

        console.log(`User ${userId} joined chat system`)
      } catch (error) {
        console.error("Error joining chat system:", error)
      }
    })

    // Join specific chat room
    socket.on("join_chat", chatId => {
      socket.join(`chat_${chatId}`)
      console.log(`User ${socket.userId} joined chat ${chatId}`)
    })

    // Leave specific chat room
    socket.on("leave_chat", chatId => {
      socket.leave(`chat_${chatId}`)
      console.log(`User ${socket.userId} left chat ${chatId}`)
    })

    // Handle new message
    socket.on("send_message", async data => {
      try {
        const { chatId, content, messageType, replyToId, metadata } = data

        // Verify user has access to chat
        const { data: participant } = await supabase.from("chat_participants").select("id").eq("chat_id", chatId).eq("user_id", socket.userId).single()

        if (!participant) {
          socket.emit("error", { message: "Access denied to chat" })
          return
        }
        console.log({
          chat_id: chatId,
          sender_id: socket.userId,
          content,
          message_type: messageType || "text",
          reply_to_id: replyToId,
          metadata: metadata || {}
        })
        // Create message in database
        const { data: message, error } = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            sender_id: socket.userId,
            content,
            message_type: messageType || "text",
            reply_to_id: replyToId,
            metadata: metadata || {}
          })
          .select(`*`)
          .single()

        if (error) throw error

        // Update chat's last_message_at
        await supabase.from("chats").update({ last_message_at: new Date() }).eq("id", chatId)

        // Broadcast message to all chat participants
        this.io.to(`chat_${chatId}`).emit("new_message", message)

        // Send push notifications to offline users
        this.sendPushNotifications(chatId, message, socket.userId)
      } catch (error) {
        console.error("Error sending message:", error)
        socket.emit("error", { message: "Failed to send message" })
      }
    })

    // Handle typing indicators
    socket.on("typing_start", data => {
      const { chatId } = data

      if (!this.typingUsers.has(chatId)) {
        this.typingUsers.set(chatId, new Set())
      }

      this.typingUsers.get(chatId).add(socket.userId)

      // Broadcast typing status to other users in chat
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId: socket.userId,
        chatId,
        isTyping: true
      })
    })

    socket.on("typing_stop", data => {
      const { chatId } = data

      if (this.typingUsers.has(chatId)) {
        this.typingUsers.get(chatId).delete(socket.userId)

        if (this.typingUsers.get(chatId).size === 0) {
          this.typingUsers.delete(chatId)
        }
      }

      // Broadcast typing stopped to other users in chat
      socket.to(`chat_${chatId}`).emit("user_typing", {
        userId: socket.userId,
        chatId,
        isTyping: false
      })
    })

    // Handle message reactions
    socket.on("add_reaction", async data => {
      try {
        const { messageId, emoji, chatId } = data

        // Add reaction to database
        const { data: reaction, error } = await supabase
          .from("message_reactions")
          .upsert({
            message_id: messageId,
            user_id: socket.userId,
            emoji
          })
          .select(
            `
            *,
            user:auth.users!message_reactions_user_id_fkey(id, email, raw_user_meta_data)
          `
          )
          .single()

        if (error) throw error

        // Broadcast reaction to all chat participants
        this.io.to(`chat_${chatId}`).emit("reaction_added", {
          messageId,
          reaction
        })
      } catch (error) {
        console.error("Error adding reaction:", error)
        socket.emit("error", { message: "Failed to add reaction" })
      }
    })

    socket.on("remove_reaction", async data => {
      try {
        const { messageId, emoji, chatId } = data

        // Remove reaction from database
        const { error } = await supabase.from("message_reactions").delete().eq("message_id", messageId).eq("user_id", socket.userId).eq("emoji", emoji)

        if (error) throw error

        // Broadcast reaction removal to all chat participants
        this.io.to(`chat_${chatId}`).emit("reaction_removed", {
          messageId,
          userId: socket.userId,
          emoji
        })
      } catch (error) {
        console.error("Error removing reaction:", error)
        socket.emit("error", { message: "Failed to remove reaction" })
      }
    })

    // Handle message read receipts
    socket.on("mark_message_read", async data => {
      try {
        const { messageId, chatId } = data

        // Add read receipt to database
        const { error } = await supabase.from("message_read_receipts").upsert({
          message_id: messageId,
          user_id: socket.userId
        })

        if (error) throw error

        // Update participant's last_read_at
        await supabase.from("chat_participants").update({ last_read_at: new Date() }).eq("chat_id", chatId).eq("user_id", socket.userId)

        // Broadcast read receipt to message sender
        socket.to(`chat_${chatId}`).emit("message_read", {
          messageId,
          userId: socket.userId,
          readAt: new Date()
        })
      } catch (error) {
        console.error("Error marking message as read:", error)
      }
    })

    // Handle voice/video call initiation
    socket.on("initiate_call", async data => {
      try {
        const { chatId, callType, participants } = data // callType: 'audio' or 'video'

        const callId = `call_${Date.now()}_${Math.random().toString(36).substring(2)}`

        const callData = {
          id: callId,
          chatId,
          initiator: socket.userId,
          type: callType,
          participants: participants || [],
          startTime: new Date(),
          status: "ringing"
        }

        this.activeCalls.set(callId, callData)

        // Create system message for call
        const { data: message } = await supabase
          .from("messages")
          .insert({
            chat_id: chatId,
            sender_id: socket.userId,
            content: `${callType === "video" ? "Video" : "Audio"} call started`,
            message_type: "call",
            metadata: { callId, callType, status: "started" }
          })
          .select(
            `
            *,
            sender:auth.users!messages_sender_id_fkey(id, email, raw_user_meta_data)
          `
          )
          .single()

        // Broadcast call invitation to chat participants
        this.io.to(`chat_${chatId}`).emit("call_invitation", {
          callId,
          callData,
          message
        })
      } catch (error) {
        console.error("Error initiating call:", error)
        socket.emit("error", { message: "Failed to initiate call" })
      }
    })

    // Handle call responses
    socket.on("call_response", data => {
      const { callId, response } = data // response: 'accept', 'decline'

      const callData = this.activeCalls.get(callId)
      if (!callData) return

      if (response === "accept") {
        callData.participants.push(socket.userId)
        callData.status = "active"
      }

      // Broadcast response to all call participants
      this.io.to(`chat_${callData.chatId}`).emit("call_response", {
        callId,
        userId: socket.userId,
        response,
        callData
      })
    })

    // Handle call end
    socket.on("end_call", async data => {
      try {
        const { callId } = data

        const callData = this.activeCalls.get(callId)
        if (!callData) return

        callData.status = "ended"
        callData.endTime = new Date()

        // Update call message in database
        await supabase
          .from("messages")
          .update({
            metadata: {
              ...callData,
              duration: Math.floor((callData.endTime - callData.startTime) / 1000)
            }
          })
          .eq("metadata->callId", callId)

        // Broadcast call end to all participants
        this.io.to(`chat_${callData.chatId}`).emit("call_ended", {
          callId,
          callData
        })

        this.activeCalls.delete(callId)
      } catch (error) {
        console.error("Error ending call:", error)
      }
    })

    // Handle WebRTC signaling for calls
    socket.on("webrtc_offer", data => {
      const { callId, offer, targetUserId } = data
      const targetSocketId = this.connectedUsers.get(targetUserId)

      if (targetSocketId) {
        this.io.to(targetSocketId).emit("webrtc_offer", {
          callId,
          offer,
          fromUserId: socket.userId
        })
      }
    })

    socket.on("webrtc_answer", data => {
      const { callId, answer, targetUserId } = data
      const targetSocketId = this.connectedUsers.get(targetUserId)

      if (targetSocketId) {
        this.io.to(targetSocketId).emit("webrtc_answer", {
          callId,
          answer,
          fromUserId: socket.userId
        })
      }
    })

    socket.on("webrtc_ice_candidate", data => {
      const { callId, candidate, targetUserId } = data
      const targetSocketId = this.connectedUsers.get(targetUserId)

      if (targetSocketId) {
        this.io.to(targetSocketId).emit("webrtc_ice_candidate", {
          callId,
          candidate,
          fromUserId: socket.userId
        })
      }
    })

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id)

      if (socket.userId) {
        this.connectedUsers.delete(socket.userId)

        // Clean up typing indicators
        for (const [chatId, typingSet] of this.typingUsers.entries()) {
          if (typingSet.has(socket.userId)) {
            typingSet.delete(socket.userId)

            // Broadcast typing stopped
            socket.to(`chat_${chatId}`).emit("user_typing", {
              userId: socket.userId,
              chatId,
              isTyping: false
            })

            if (typingSet.size === 0) {
              this.typingUsers.delete(chatId)
            }
          }
        }

        // Broadcast user offline status
        this.broadcastUserStatus(socket.userId, "offline")
      }
    })
  }

  broadcastUserStatus(userId, status) {
    this.io.emit("user_status_changed", {
      userId,
      status,
      timestamp: new Date()
    })
  }

  async sendPushNotifications(chatId, message, senderId) {
    try {
      // Get all chat participants except sender
      const { data: participants } = await supabase.from("chat_participants").select("user_id").eq("chat_id", chatId).neq("user_id", senderId)

      if (!participants) return

      // Filter out online users (they already received the message)
      const offlineUsers = participants.filter(p => !this.connectedUsers.has(p.user_id))

      // Here you would integrate with your push notification service
      // (Firebase, OneSignal, etc.)
      console.log(`Would send push notifications to ${offlineUsers.length} offline users`)
    } catch (error) {
      console.error("Error sending push notifications:", error)
    }
  }
}

module.exports = ChatSocketHandler
