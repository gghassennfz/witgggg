const supabase = require("../supabaseClient")

// Send mate request by email, username, or code
exports.sendMateRequest = async (req, res) => {
  const fromUserId = req.user.id
  const { query } = req.body

  if (!query || typeof query !== "string") {
    return res.status(400).json({ error: "Missing or invalid query" })
  }

  try {
    // Find the user by email, username, or code (case-insensitive)
    const { data: toUser, error: userError } = await supabase.from("profiles").select("id").or(`email.ilike.${query},username.ilike.${query},code.eq.${query}`).single()

    if (userError || !toUser) return res.status(404).json({ error: "User not found" })
    if (toUser.id === fromUserId) return res.status(400).json({ error: "Cannot add yourself" })

    // Check if a pending request already exists between these users in either direction
    const { data: existingRequests, error: requestError } = await supabase.from("mate_requests").select("*").or(`and(sender_id.eq.${fromUserId},receiver_id.eq.${toUser.id}),and(sender_id.eq.${toUser.id},receiver_id.eq.${fromUserId})`).eq("status", "pending")

    if (requestError) throw requestError

    if (existingRequests && existingRequests.length > 0) {
      return res.status(400).json({ error: "Request already exists or already mates" })
    }

    // Insert new mate request
    const { data: newRequest, error: insertError } = await supabase
      .from("mate_requests")
      .insert([
        {
          sender_id: fromUserId,
          receiver_id: toUser.id,
          status: "pending",
          created_at: new Date().toISOString()
        }
      ])
      .single()

    if (insertError) throw insertError

    res.status(201).json({ request: newRequest })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// List all accepted mates for current user
exports.getMates = async (req, res) => {
  const userId = req.user.id

  try {
    // Step 1: Get mate IDs from the 'mates' table
    const { data: mateLinks, error: matesError } = await supabase.from("mates").select("mate_id").eq("user_id", userId)

    if (matesError) throw matesError

    const mateIds = mateLinks.map(link => link.mate_id)

    // Step 2: Get full mate profile details
    let mates = []
    if (mateIds.length > 0) {
      const { data: mateProfiles, error: profilesError } = await supabase.from("profiles").select("id, username, email, avatar_url, code").in("id", mateIds)

      if (profilesError) throw profilesError

      mates = mateProfiles
    }

    res.json({ mates })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// List all pending mate requests for current user
exports.getMateRequests = async (req, res) => {
  const userId = req.user.id

  try {
    // Fetch incoming (received) requests
    const { data: received, error: receivedError } = await supabase
      .from("mate_requests")
      .select(
        `
        id,
        sender:sender_id (id, username, email, avatar_url),
        status,
        created_at
      `
      )
      .eq("receiver_id", userId)
      .eq("status", "pending")

    if (receivedError) throw receivedError

    // Fetch outgoing (sent) requests
    const { data: sent, error: sentError } = await supabase
      .from("mate_requests")
      .select(
        `
        id,
        receiver:receiver_id (id, username, email, avatar_url),
        status,
        created_at
      `
      )
      .eq("sender_id", userId)
      .eq("status", "pending")

    if (sentError) throw sentError

    res.json({ received, sent })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// Accept/reject a mate request
exports.respondToMateRequest = async (req, res) => {
  const userId = req.user.id
  const { requestId } = req.params
  const { action } = req.body // 'accept' or 'reject'

  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ error: "Invalid action" })
  }

  try {
    // Fetch the mate request by ID
    const { data: request, error: fetchError } = await supabase.from("mate_requests").select("id, sender_id, receiver_id, status").eq("id", requestId).single()

    if (fetchError || !request) {
      return res.status(404).json({ error: "Request not found" })
    }

    if (request.receiver_id !== userId) {
      return res.status(403).json({ error: "Not authorized to respond to this request" })
    }

    // Update the request's status
    const newStatus = action === "accept" ? "accepted" : "rejected"

    const { error: updateError } = await supabase.from("mate_requests").update({ status: newStatus }).eq("id", requestId)

    if (updateError) throw updateError

    // If accepted, add both users to each other’s mates (in a join table or field)
    if (newStatus === "accepted") {
      // Check if the mate relationship already exists
      const { data: existingMates, error: checkError } = await supabase.from("mates").select("user_id, mate_id").or(`and(user_id.eq.${userId},mate_id.eq.${request.sender_id}),and(user_id.eq.${request.sender_id},mate_id.eq.${userId})`)

      if (checkError) throw checkError

      const alreadyConnected = existingMates && existingMates.length === 2

      if (!alreadyConnected) {
        const { error: insertError } = await supabase.from("mates").insert([
          { user_id: userId, mate_id: request.sender_id },
          { user_id: request.sender_id, mate_id: userId }
        ])

        if (insertError) throw insertError
      }
    }

    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

exports.cancelMateRequest = async (req, res) => {
  const userId = req.user.id
  const { requestId } = req.params

  try {
    // Fetch the request to ensure the user is the sender
    const { data: request, error } = await supabase.from("mate_requests").select("id, sender_id, status").eq("id", requestId).single()

    if (error || !request) {
      return res.status(404).json({ error: "Request not found" })
    }

    if (request.sender_id !== userId) {
      return res.status(403).json({ error: "You can only cancel requests you sent" })
    }

    if (request.status !== "pending") {
      return res.status(400).json({ error: "Only pending requests can be cancelled" })
    }

    // Delete the request
    const { error: deleteError } = await supabase.from("mate_requests").delete().eq("id", requestId)

    if (deleteError) throw deleteError

    res.json({ success: true, message: "Mate request cancelled" })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
}

// (Optional) List notifications for current user
exports.getNotifications = async (req, res) => {
  // Placeholder: implement if you want notification system
  res.json({ notifications: [] })
}
