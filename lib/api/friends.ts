import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type FriendStatus = "pending" | "accepted" | "rejected"

export type FriendRequest = {
  id: string
  sender_id: string
  receiver_id: string
  status: FriendStatus
  created_at: string
  updated_at: string
}

export type Friendship = {
  id: string
  user_id: string
  friend_id: string
  created_at: string
}

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  created_at: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  location: string | null
}

export type FriendWithProfile = FriendRequest & {
  profile: Profile
}

// Client-side functions
export async function searchUsersByEmail(query: string) {
  const supabase = createBrowserClient()

  console.log("[v0] Searching for users with query:", query)

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.log("[v0] User not authenticated")
    throw new Error("Not authenticated")
  }

  console.log("[v0] Current user ID:", user.id)

  if (!query || query.trim().length === 0) {
    console.log("[v0] Empty search query")
    return []
  }

  try {
    // Function expects: requesting_user_id FIRST, search_query SECOND
    const { data, error } = await supabase.rpc("search_users_secure", {
      requesting_user_id: user.id,
      search_query: query.trim(),
    })

    if (error) {
      console.error("[v0] Search error details:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
      })

      if (error.code === "42883" || error.message.includes("function") || error.message.includes("does not exist")) {
        console.log("[v0] Function not found, trying direct query fallback")

        // Fallback: direct query on profiles table
        const searchTerm = `%${query.trim().toLowerCase()}%`
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("profiles")
          .select("*")
          .or(
            `email.ilike.${searchTerm},display_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm},phone.ilike.${searchTerm},location.ilike.${searchTerm}`,
          )
          .neq("id", user.id)
          .limit(10)

        if (fallbackError) {
          console.error("[v0] Fallback query error:", fallbackError)
          throw new Error(`Search failed: ${fallbackError.message}`)
        }

        console.log("[v0] Fallback query results:", fallbackData)
        return (fallbackData || []) as Profile[]
      }

      throw new Error(`Search failed: ${error.message}`)
    }

    console.log("[v0] Raw search results:", data)

    if (!data || !Array.isArray(data)) {
      console.log("[v0] No data returned or invalid format")
      return []
    }

    // Filter out invalid results
    const validResults = (data as Profile[]).filter((profile) => {
      const isValid = profile && profile.id && profile.display_name && profile.display_name.trim().length > 0
      if (!isValid) {
        console.log("[v0] Filtered out invalid profile:", profile)
      }
      return isValid
    })

    console.log("[v0] Valid search results after filtering:", validResults.length, "results")
    return validResults
  } catch (error: any) {
    console.error("[v0] Exception during search:", error)
    throw error
  }
}

export async function sendFriendRequest(friendId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  console.log("[v0] sendFriendRequest: Checking existing requests/friendships")

  // Check if already friends
  const { data: existingFriendship } = await supabase
    .from("friendships")
    .select("id")
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`,
    )
    .maybeSingle()

  if (existingFriendship) {
    console.log("[v0] sendFriendRequest: Already friends")
    throw new Error("Already friends")
  }

  // Check if friend request already exists
  const { data: existing } = await supabase
    .from("friend_requests")
    .select("id, status")
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`,
    )
    .maybeSingle()

  if (existing) {
    if (existing.status === "pending") {
      throw new Error("Friend request already sent")
    } else if (existing.status === "rejected") {
      // Delete the old rejected request so we can send a new one
      console.log("[v0] Deleting old rejected friend request:", existing.id)
      const { error: deleteError } = await supabase
        .from("friend_requests")
        .delete()
        .eq("id", existing.id)

      if (deleteError) {
        console.error("[v0] Error deleting rejected friend request:", deleteError)
        throw new Error("Failed to resend friend request")
      }
    }
  }

  console.log("[v0] Sending friend request from", user.id, "to", friendId)

  const { data, error } = await supabase
    .from("friend_requests")
    .insert({
      sender_id: user.id,
      receiver_id: friendId,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error sending friend request:", error)
    if (error.code === "23505") {
      throw new Error("Friend request already exists")
    }
    throw new Error(`Failed to send friend request: ${error.message}`)
  }

  console.log("[v0] Friend request sent successfully:", data)
  return data as FriendRequest
}

export async function acceptFriendRequest(requestId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // First, try to fetch the request to get sender_id
  const { data: request, error: fetchError } = await supabase
    .from("friend_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle()

  if (fetchError) {
    console.error("[v0] Error fetching friend request:", fetchError)
    throw fetchError
  }
  if (!request) throw new Error("Friend request not found")

  // Verify the current user is the receiver
  if (request.receiver_id !== user.id) {
    throw new Error("You can only accept requests sent to you")
  }

  // Create friendship records FIRST (both directions)
  // This prevents orphaned "accepted" friend requests if friendship creation fails
  console.log("[v0] Creating friendship records...")
  const { error: friendshipError1 } = await supabase.from("friendships").insert({
    user_id: request.sender_id,
    friend_id: request.receiver_id,
  })

  if (friendshipError1) {
    console.error("[v0] Error creating friendship (direction 1):", friendshipError1)
    throw friendshipError1
  }

  const { error: friendshipError2 } = await supabase.from("friendships").insert({
    user_id: request.receiver_id,
    friend_id: request.sender_id,
  })

  if (friendshipError2) {
    console.error("[v0] Error creating friendship (direction 2):", friendshipError2)
    // Rollback the first friendship record
    console.log("[v0] Rolling back first friendship record...")
    await supabase
      .from("friendships")
      .delete()
      .eq("user_id", request.sender_id)
      .eq("friend_id", request.receiver_id)
    throw friendshipError2
  }

  // Delete the friend request if both friendships were created successfully
  console.log("[v0] Friendships created successfully, deleting friend request...")
  const { error: deleteError } = await supabase
    .from("friend_requests")
    .delete()
    .eq("id", requestId)
    .eq("receiver_id", user.id)

  if (deleteError) {
    console.error("[v0] Error deleting friend request:", deleteError)
    // Rollback both friendship records
    console.log("[v0] Rolling back friendship records...")
    await supabase
      .from("friendships")
      .delete()
      .or(
        `and(user_id.eq.${request.sender_id},friend_id.eq.${request.receiver_id}),and(user_id.eq.${request.receiver_id},friend_id.eq.${request.sender_id})`
      )
    throw deleteError
  }

  console.log("[v0] Friend request accepted successfully!")
  return request as FriendRequest
}

export async function declineFriendRequest(requestId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", requestId)
    .eq("receiver_id", user.id)
    .select()
    .maybeSingle()

  if (error) throw error
  if (!data) throw new Error("Friend request not found")
  return data as FriendRequest
}

export async function removeFriend(friendId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Delete both directions of the friendship
  const { error: friendshipError } = await supabase
    .from("friendships")
    .delete()
    .or(
      `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
    )

  if (friendshipError) throw friendshipError

  // Also delete any friend request records between these users
  const { error: requestError } = await supabase
    .from("friend_requests")
    .delete()
    .or(
      `and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`
    )

  if (requestError) {
    console.error("[v0] Error deleting friend request:", requestError)
    // Don't throw here - friendship deletion is more important
  }
}

export async function getFriends() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Not authenticated")

    console.log("[v0] getFriends: Fetching friendships for user:", user.id)

    // Get all friendships where user is user_id
    const { data: sentFriendships, error: sentError } = await supabase
      .from("friendships")
      .select("*")
      .eq("user_id", user.id)

    if (sentError) {
      console.error("[v0] getFriends: Error fetching sent friendships:", {
        message: sentError.message,
        code: sentError.code,
        details: sentError.details,
        hint: sentError.hint
      })
      throw sentError
    }

    // Get all friendships where user is friend_id
    const { data: receivedFriendships, error: receivedError } = await supabase
      .from("friendships")
      .select("*")
      .eq("friend_id", user.id)

    if (receivedError) {
      console.error("[v0] getFriends: Error fetching received friendships:", {
        message: receivedError.message,
        code: receivedError.code,
        details: receivedError.details,
        hint: receivedError.hint
      })
      throw receivedError
    }

    console.log("[v0] getFriends: Sent friendships:", sentFriendships?.length || 0)
    console.log("[v0] getFriends: Received friendships:", receivedFriendships?.length || 0)

    // Combine all friend IDs (remove duplicates)
    const friendIds = Array.from(new Set([
      ...(sentFriendships?.map((f) => f.friend_id) || []),
      ...(receivedFriendships?.map((f) => f.user_id) || []),
    ]))

    console.log("[v0] getFriends: Unique friend IDs:", friendIds)

    if (friendIds.length === 0) return []

    // Get profiles for all friends
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("*")
      .in("id", friendIds)

    if (profilesError) {
      console.error("[v0] getFriends: Error fetching profiles:", {
        message: profilesError.message,
        code: profilesError.code,
        details: profilesError.details,
        hint: profilesError.hint
      })
      throw profilesError
    }

    console.log("[v0] getFriends: Fetched profiles:", profiles?.length || 0)

    // Create a map to deduplicate friends by their ID
    const friendsMap = new Map()
    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    // Process sent friendships
    sentFriendships?.forEach((friendship) => {
      const friendId = friendship.friend_id
      if (!friendsMap.has(friendId)) {
        friendsMap.set(friendId, {
          ...friendship,
          friend: profileMap.get(friendId),
        })
      }
    })

    // Process received friendships
    receivedFriendships?.forEach((friendship) => {
      const friendId = friendship.user_id
      if (!friendsMap.has(friendId)) {
        friendsMap.set(friendId, {
          ...friendship,
          friend: profileMap.get(friendId),
        })
      }
    })

    const result = Array.from(friendsMap.values())
    console.log("[v0] getFriends: Returning", result.length, "unique friends")
    return result
  } catch (error: any) {
    console.error("[v0] Error in getFriends:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    })
    throw error
  }
}

export async function getPendingFriendRequests() {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data, error } = await supabase
    .from("friend_requests")
    .select(`
      *,
      requester:profiles!friend_requests_sender_id_fkey(*)
    `)
    .eq("receiver_id", user.id)
    .eq("status", "pending")

  if (error) throw error
  return data || []
}

export async function getReceivedFriendRequests() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error || !data) return []

    // Get profiles for senders
    const senderIds = [...new Set(data.map((r) => r.sender_id))]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", senderIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return data.map((req) => ({
      ...req,
      sender: profileMap.get(req.sender_id) || { id: req.sender_id, display_name: "Unknown", avatar_url: null },
    }))
  } catch (error) {
    console.error("[v0] Error in getReceivedFriendRequests:", error)
    return []
  }
}

export async function getSentFriendRequests() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("friend_requests")
      .select("*")
      .eq("sender_id", user.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })

    if (error || !data) return []

    // Get profiles for receivers
    const receiverIds = [...new Set(data.map((r) => r.receiver_id))]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", receiverIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return data.map((req) => ({
      ...req,
      receiver: profileMap.get(req.receiver_id) || { id: req.receiver_id, display_name: "Unknown", avatar_url: null },
    }))
  } catch (error) {
    console.error("[v0] Error in getSentFriendRequests:", error)
    return []
  }
}
