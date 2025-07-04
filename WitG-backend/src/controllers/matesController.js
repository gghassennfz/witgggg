const supabase = require("../supabaseClient")

// Send a mate request to another user by their user code
const sendMateRequest = async (req, res) => {
  const { code } = req.body // The user_code of the person to befriend
  const action_user_id = req.user.id // The ID of the user sending the request

  if (!code) {
    return res.status(400).json({ error: "User code is required." })
  }

  try {
    // 1. Find the user to befriend by their code
    const { data: recipient, error: recipientError } = await supabase.from("profiles").select("id").eq("code", code).single()

    if (recipientError || !recipient) {
      return res.status(404).json({ error: "User with that code not found." })
    }

    const recipient_id = recipient.id

    if (recipient_id === action_user_id) {
      return res.status(400).json({ error: "You cannot send a mate request to yourself." })
    }

    // 2. Check if a relationship already exists
    const { data: existing } = await supabase.from("mates").select("*").or(`(user_one_id.eq.${action_user_id},user_two_id.eq.${recipient_id}),(user_one_id.eq.${recipient_id},user_two_id.eq.${action_user_id})`)

    if (existing && existing.length > 0) {
      return res.status(409).json({ error: "A mate request already exists with this user." })
    }

    // 3. Create the pending mate request
    const user_one_id = action_user_id < recipient_id ? action_user_id : recipient_id
    const user_two_id = action_user_id > recipient_id ? action_user_id : recipient_id

    const { data: newRequest, error: insertError } = await supabase
      .from("mates")
      .insert({
        user_one_id,
        user_two_id,
        status: "pending",
        action_user_id: action_user_id
      })
      .select()
      .single()

    if (insertError) throw insertError

    res.status(201).json(newRequest)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Update the status of a mate request (accept, decline)
const updateMateRequest = async (req, res) => {
  const { requestId } = req.params
  const { status } = req.body // 'accepted' or 'declined'
  const action_user_id = req.user.id

  if (!["accepted", "declined"].includes(status)) {
    return res.status(400).json({ error: "Invalid status provided." })
  }

  try {
    const { data: request, error: findError } = await supabase.from("mates").select("*").eq("id", requestId).single()

    if (findError || !request) {
      return res.status(404).json({ error: "Mate request not found." })
    }

    if (request.action_user_id === action_user_id) {
      return res.status(403).json({ error: "You cannot respond to a request you sent." })
    }

    const { data: updatedRequest, error: updateError } = await supabase.from("mates").update({ status: status, action_user_id: action_user_id }).eq("id", requestId).select().single()

    if (updateError) throw updateError

    res.status(200).json(updatedRequest)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get all mates for the current user (pending, accepted, etc.)
const getMates = async (req, res) => {
  const userId = req.user.id

  try {
    const { data, error } = await supabase
      .from("mates")
      .select(
        `
                id,
                status,
                action_user_id,
                user_one:profiles!user_one_id ( id, username, full_name, avatar_url, code ),
                user_two:profiles!user_two_id ( id, username, full_name, avatar_url, code )
            `
      )
      .or(`user_one_id.eq.${userId},user_two_id.eq.${userId}`)

    if (error) throw error

    const mates = data.map(mate => {
      const otherUser = mate.user_one.id === userId ? mate.user_two : mate.user_one
      return {
        requestId: mate.id,
        status: mate.status,
        isSender: mate.action_user_id === userId,
        mateInfo: otherUser
      }
    })

    res.status(200).json(mates)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

// Get the current user's profile, including their user code
const getMyProfile = async (req, res) => {
  const userId = req.user.id
  try {
    const { data, error } = await supabase.from("profiles").select("id, username, full_name, avatar_url, code").eq("id", userId).single()

    if (error) throw error

    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
}

module.exports = {
  sendMateRequest,
  updateMateRequest,
  getMates,
  getMyProfile
}
