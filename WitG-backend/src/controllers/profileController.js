const supabase = require("../supabaseClient")

const getProfile = async (req, res) => {
  const { user } = req // Attached by authMiddleware

  try {
    // Fetch profile from 'profiles' table
    const { data: profileData, error: profileError } = await supabase.from("profiles").select("username, full_name, avatar_url, bio, mates, mate_requests").eq("id", user.id).single()

    if (profileError) {
      if (profileError.code === "PGRST116") {
        return res.status(404).json({ error: "Profile not found." })
      }
      throw profileError
    }

    // The user object from the JWT contains the email
    const profile = {
      ...profileData,
      email: user.email
    }

    res.status(200).json(profile)
  } catch (error) {
    res.status(500).json({ error: "Server error while fetching profile.", details: error.message })
  }
}

const updateProfile = async (req, res) => {
  const { user } = req // Attached by authMiddleware
  const { full_name, username, bio } = req.body

  if (!full_name && !username && !bio) {
    return res.status(400).json({ error: "No update data provided." })
  }

  const updates = {}
  if (full_name) updates.full_name = full_name
  if (username) updates.username = username
  if (bio) updates.bio = bio
  updates.updated_at = new Date()

  try {
    const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select("username, full_name, avatar_url, bio, mates").single()

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({ error: "Username is already taken." })
      }
      throw error
    }

    res.status(200).json(data)
  } catch (error) {
    res.status(500).json({ error: "Server error while updating profile.", details: error.message })
  }
}

const changePassword = async (req, res) => {
  const { user } = req // Attached by authMiddleware
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Current password and new password are required." })
  }

  try {
    // 1. Verify the current password by trying to sign in with it.
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      return res.status(401).json({ error: "Incorrect current password." })
    }

    // 2. If verification is successful, update the user's password.
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      return res.status(422).json({ error: "Failed to update password. It may be too weak.", details: updateError.message })
    }

    res.status(200).json({ message: "Password updated successfully." })
  } catch (error) {
    res.status(500).json({ error: "Server error while changing password.", details: error.message })
  }
}

module.exports = {
  getProfile,
  updateProfile,
  changePassword
}
