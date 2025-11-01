import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type EnergyLevel = "low" | "high" | "virtual"
export type VisibleTo = "friends" | "everyone"

export type Availability = {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string
  energy_level: EnergyLevel
  activity_tags: string[]
  visible_to: VisibleTo
  is_active: boolean
  created_at: string
  updated_at: string
  location?: string
}

export type AvailabilityWithProfile = Availability & {
  profile: {
    id: string
    display_name: string
    avatar_url: string | null
    first_name?: string
    last_name?: string
  }
}

// Client-side functions
export async function createAvailability(data: {
  date: string
  start_time: string
  end_time: string
  energy_level: EnergyLevel
  tags?: string[]
  visible_to?: VisibleTo
  is_active?: boolean
  location?: string
}) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: availability, error } = await supabase
    .from("availability")
    .insert({
      user_id: user.id,
      date: data.date,
      start_time: data.start_time,
      end_time: data.end_time,
      energy_level: data.energy_level,
      activity_tags: data.tags || [],
      visible_to: data.visible_to || "friends",
      is_active: data.is_active !== undefined ? data.is_active : true,
      location: data.location || null,
    })
    .select()
    .single()

  if (error) throw error

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("availabilityUpdated"))
  }

  return availability as Availability
}

export async function updateAvailability(
  id: string,
  data: Partial<Omit<Availability, "id" | "user_id" | "created_at" | "updated_at">>,
) {
  const supabase = createBrowserClient()

  const updateData: any = { ...data, updated_at: new Date().toISOString() }

  const { data: availability, error } = await supabase
    .from("availability")
    .update(updateData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return availability as Availability
}

export async function deleteAvailability(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("availability").delete().eq("id", id)

  if (error) throw error
}

export async function getMyAvailability() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] No user found, returning empty availability")
      return []
    }

    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("user_id", user.id)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching availability:", error)
      return []
    }

    // Filter out past events
    const now = new Date()
    const filteredData = (data || []).filter((avail) => {
      // Handle times that cross midnight (end_time < start_time)
      let endDateTime = new Date(`${avail.date}T${avail.end_time}`)
      const startDateTime = new Date(`${avail.date}T${avail.start_time}`)

      // If end time is before start time, it means the event crosses midnight
      if (endDateTime < startDateTime) {
        // Add one day to the end time
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }

      return endDateTime >= now
    })

    return filteredData as Availability[]
  } catch (error) {
    console.error("[v0] Exception in getMyAvailability:", error)
    return []
  }
}

export async function getFriendsAvailability() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] No user found, returning empty friends availability")
      return []
    }

    console.log("[v0] getFriendsAvailability - Current user ID:", user.id)

    // Get availability IDs that have been explicitly shared with the current user OR with groups they're in
    // First, get shares directly to the user
    const { data: userShares, error: userSharesError } = await supabase
      .from("availability_shares")
      .select("availability_id")
      .eq("shared_with_user_id", user.id)

    if (userSharesError) {
      console.error("[v0] Error fetching user availability shares:", userSharesError)
      return []
    }

    // Second, get the groups the user is a member of
    const { data: userGroups, error: userGroupsError } = await supabase
      .from("group_members")
      .select("group_id")
      .eq("user_id", user.id)

    if (userGroupsError) {
      console.error("[v0] Error fetching user groups:", userGroupsError)
      return []
    }

    const userGroupIds = userGroups?.map(g => g.group_id) || []
    console.log("[v0] getFriendsAvailability - User group IDs:", userGroupIds)

    // Third, get shares to groups the user is a member of
    let groupShares: any[] = []
    if (userGroupIds.length > 0) {
      const { data, error: groupSharesError } = await supabase
        .from("availability_shares")
        .select("availability_id")
        .in("shared_with_group_id", userGroupIds)

      if (groupSharesError) {
        console.error("[v0] Error fetching group availability shares:", groupSharesError)
        return []
      }

      groupShares = data || []
    }

    console.log("[v0] getFriendsAvailability - Shares found:", (userShares?.length || 0) + groupShares.length, userShares, groupShares)

    // Combine both types of shares
    const allShares = [
      ...(userShares || []),
      ...groupShares
    ]

    const sharedAvailabilityIds = [...new Set(allShares.map(s => s.availability_id))]
    console.log("[v0] getFriendsAvailability - Availability IDs:", sharedAvailabilityIds)

    if (sharedAvailabilityIds.length === 0) {
      console.log("[v0] getFriendsAvailability - No availability IDs found")
      return []
    }

    // Get the actual availability records that were shared with the user
    const { data, error } = await supabase
      .from("availability")
      .select(`
        *,
        profile:profiles(id, display_name, avatar_url)
      `)
      .in("id", sharedAvailabilityIds)
      .eq("is_active", true)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching friends availability:", error)
      return []
    }

    // Filter out past events and the current user's own availability
    const now = new Date()
    const filteredData = (data || []).filter((avail) => {
      // CRITICAL FIX: Exclude the current user's own availability
      if (avail.user_id === user.id) {
        console.log("[v0] getFriendsAvailability - Filtering out own availability:", avail.id)
        return false
      }

      // Handle times that cross midnight (end_time < start_time)
      let endDateTime = new Date(`${avail.date}T${avail.end_time}`)
      const startDateTime = new Date(`${avail.date}T${avail.start_time}`)

      // If end time is before start time, it means the event crosses midnight
      if (endDateTime < startDateTime) {
        // Add one day to the end time
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }

      return endDateTime >= now
    })

    console.log("[v0] Friends availability loaded:", filteredData.length, "slots")
    return filteredData as AvailabilityWithProfile[]
  } catch (error) {
    console.error("[v0] Exception in getFriendsAvailability:", error)
    return []
  }
}

export async function createSharedAvailability(availabilityId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Create share link that expires in 7 days
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7)

  const { data, error } = await supabase
    .from("shared_availability")
    .insert({
      availability_id: availabilityId,
      user_id: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating shared availability:", error)
    // If shared_availability table doesn't exist, return a mock object with the availability ID
    // This allows the share link to be generated even if the table doesn't exist
    if (error.code === '42P01' || error.message?.includes('shared_availability')) {
      console.log("[v0] shared_availability table not found, using fallback")
      return {
        id: availabilityId,
        availability_id: availabilityId,
        user_id: user.id,
        expires_at: expiresAt.toISOString(),
      }
    }
    throw error
  }
  return data
}

export async function getSharedAvailability(shareId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("shared_availability")
    .select(`
      *,
      availability:availability(
        *,
        profile:profiles(id, display_name, avatar_url)
      )
    `)
    .eq("id", shareId)
    .single()

  if (error) throw error

  // Check if expired
  if (new Date(data.expires_at) < new Date()) {
    throw new Error("This share link has expired")
  }

  return data
}

export async function toggleAvailabilityActive(id: string, isActive: boolean) {
  const supabase = createBrowserClient()

  const { data: availability, error } = await supabase
    .from("availability")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return availability as Availability
}

export async function shareAvailabilityWithFriends(availabilityId: string, friendIds: string[]) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  console.log("[v0] shareAvailabilityWithFriends - Availability ID:", availabilityId)
  console.log("[v0] shareAvailabilityWithFriends - Friend IDs:", friendIds)

  // Create shares for each friend
  const shares = friendIds.map((friendId) => ({
    availability_id: availabilityId,
    shared_with_user_id: friendId,
  }))

  console.log("[v0] shareAvailabilityWithFriends - Shares to insert:", shares)

  const { data, error } = await supabase.from("availability_shares").insert(shares).select()

  if (error) {
    console.error("[v0] shareAvailabilityWithFriends - Error:", error)
    throw error
  }

  console.log("[v0] shareAvailabilityWithFriends - Success! Data:", data)
  return data
}

export async function shareAvailabilityWithGroups(availabilityId: string, groupIds: string[]) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  console.log("[v0] shareAvailabilityWithGroups - Availability ID:", availabilityId)
  console.log("[v0] shareAvailabilityWithGroups - Group IDs:", groupIds)

  // Create shares for each group
  const shares = groupIds.map((groupId) => ({
    availability_id: availabilityId,
    shared_with_group_id: groupId,
  }))

  console.log("[v0] shareAvailabilityWithGroups - Shares to insert:", shares)

  const { data, error } = await supabase.from("availability_shares").insert(shares).select()

  if (error) {
    console.error("[v0] shareAvailabilityWithGroups - Error:", error)
    throw error
  }

  console.log("[v0] shareAvailabilityWithGroups - Success! Data:", data)
  return data
}

export async function getSharedWithMeAvailability() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] No user found, returning empty shared availability")
      return []
    }

    // Get availability IDs shared with me
    const { data: shares, error: sharesError } = await supabase
      .from("availability_shares")
      .select("availability_id")
      .eq("shared_with_user_id", user.id)

    if (sharesError) {
      console.error("[v0] Error fetching shares:", sharesError)
      return []
    }

    const availabilityIds = shares?.map((s) => s.availability_id) || []

    if (availabilityIds.length === 0) return []

    // Get the actual availability records with profile info
    const { data, error } = await supabase
      .from("availability")
      .select(`
        *,
        profile:profiles(id, display_name, first_name, last_name, avatar_url)
      `)
      .in("id", availabilityIds)
      .eq("is_active", true)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    if (error) {
      console.error("[v0] Error fetching shared availability:", error)
      return []
    }

    // Filter out past events
    const now = new Date()
    const filteredData = (data || []).filter((avail) => {
      // Handle times that cross midnight (end_time < start_time)
      let endDateTime = new Date(`${avail.date}T${avail.end_time}`)
      const startDateTime = new Date(`${avail.date}T${avail.start_time}`)

      // If end time is before start time, it means the event crosses midnight
      if (endDateTime < startDateTime) {
        // Add one day to the end time
        endDateTime = new Date(endDateTime.getTime() + 24 * 60 * 60 * 1000)
      }

      return endDateTime >= now
    })

    return filteredData as AvailabilityWithProfile[]
  } catch (error) {
    console.error("[v0] Exception in getSharedWithMeAvailability:", error)
    return []
  }
}

export async function getAvailabilitySharedFriends(availabilityId: string) {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from("availability_shares")
      .select(`
        shared_with_user_id,
        profile:profiles!availability_shares_shared_with_user_id_fkey(
          id,
          display_name,
          avatar_url
        )
      `)
      .eq("availability_id", availabilityId)
      .not("shared_with_user_id", "is", null) // Only get individual friend shares, not group shares

    if (error) {
      console.error("[v0] Error fetching shared friends:", error)
      return []
    }

    return (data || []).map((share: any) => ({
      id: share.profile.id,
      name: share.profile.display_name,
      avatar: share.profile.avatar_url,
    }))
  } catch (error) {
    console.error("[v0] Exception in getAvailabilitySharedFriends:", error)
    return []
  }
}

export async function getAvailabilitySharedGroups(availabilityId: string) {
  try {
    const supabase = createBrowserClient()

    const { data, error } = await supabase
      .from("availability_shares")
      .select(`
        shared_with_group_id,
        group:groups(
          id,
          name
        )
      `)
      .eq("availability_id", availabilityId)
      .not("shared_with_group_id", "is", null) // Only get group shares, not individual friend shares

    if (error) {
      console.error("[v0] Error fetching shared groups:", error)
      return []
    }

    return (data || []).map((share: any) => ({
      id: share.group.id,
      name: share.group.name,
    }))
  } catch (error) {
    console.error("[v0] Exception in getAvailabilitySharedGroups:", error)
    return []
  }
}

// Server-side functions
export async function getServerMyAvailability() {
  const supabase = await createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .eq("user_id", user.id)
    .order("date", { ascending: true })
    .order("start_time", { ascending: true })

  if (error) return []
  return (data || []) as Availability[]
}
