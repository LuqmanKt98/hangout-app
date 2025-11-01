import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { getRequestStatusForAvailability } from "./requests"

export async function getConfirmedPlans() {
  try {
    const supabase = createBrowserClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return []

    const { data, error } = await supabase
      .from("hangout_requests")
      .select(`
        *,
        requester:profiles!hangout_requests_sender_id_fkey(id, display_name, avatar_url, first_name, last_name),
        recipient:profiles!hangout_requests_receiver_id_fkey(id, display_name, avatar_url, first_name, last_name),
        availability:availability(*)
      `)
      .eq("status", "accepted")
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false })

    if (error || !data) return []

    // Get current date and time for filtering
    const now = new Date()

    const plans = data
      .map((request) => {
        const friend = request.sender_id === user.id ? request.recipient : request.requester

        // Check if the event has already ended (past date or past time on today's date)
        let endTime = new Date(`${request.request_date}T${request.end_time}`)
        const startTime = new Date(`${request.request_date}T${request.start_time}`)

        // Handle times that cross midnight (end_time < start_time)
        if (endTime < startTime) {
          // Add one day to the end time
          endTime = new Date(endTime.getTime() + 24 * 60 * 60 * 1000)
        }

        // Skip events that have already ended
        if (endTime < now) {
          return null
        }

        console.log("[v0] getConfirmedPlans - Request status:", request.status, "Request ID:", request.id)

        return {
          id: request.id,
          friend: {
            name: friend?.display_name || "Unknown",
            firstName: friend?.first_name || "",
            lastName: friend?.last_name || "",
            avatar: friend?.avatar_url || null,
            initials: friend?.display_name
              ? friend.display_name.split(" ").map((n: string) => n[0]).join("").toUpperCase()
              : "??",
          },
          date: new Date(request.request_date),
          dateString: request.request_date, // Store original date string to avoid timezone issues
          time: `${startTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })} - ${endTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}`,
          activity: request.message || "Hangout",
          location: request.availability?.location || "TBD",
          energy: request.availability?.energy_level || "low",
          status: request.status,
          tags: request.availability?.tags || [],
        }
      })
      .filter((plan) => plan !== null)

    return plans
  } catch (error) {
    console.error("Error in getConfirmedPlans:", error)
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
      console.log("[v0] User not authenticated in getFriendsAvailability")
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

    const availabilityIds = [...new Set(allShares.map(s => s.availability_id))]

    if (availabilityIds.length === 0) {
      console.log("[v0] getFriendsAvailability - No availability IDs found")
      return []
    }

    console.log("[v0] getFriendsAvailability - Availability IDs:", availabilityIds)

    const now = new Date()
    const today = now.toISOString().split("T")[0]
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5) // HH:MM format

    // First, fetch all availability records for the given IDs
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .in("id", availabilityIds)
      .eq("is_active", true)
      .order("date", { ascending: true })
      .order("start_time", { ascending: true })

    console.log("[v0] getFriendsAvailability - Raw data from DB:", data?.length || 0, "error:", error)

    // Now fetch the profiles for all the user_ids
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((a: any) => a.user_id))]
      console.log("[v0] getFriendsAvailability - User IDs to fetch:", userIds)

      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, first_name, last_name")
        .in("id", userIds)

      if (profilesError) {
        console.error("[v0] Error fetching profiles:", profilesError)
      } else {
        console.log("[v0] Fetched profiles:", profilesData?.length || 0)
        // Create a map of user_id -> profile
        const profileMap = new Map(profilesData?.map((p: any) => [p.id, p]) || [])

        // Attach profiles to availability records
        data.forEach((avail: any) => {
          avail.profiles = profileMap.get(avail.user_id)
        })
      }
    }

    if (error) {
      console.error("[v0] Error fetching availability:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      })
      return []
    }

    console.log("[v0] getFriendsAvailability - Availability records found:", data?.length || 0)

    // Filter out past events and the current user's own availability
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

    console.log("[v0] getFriendsAvailability - After filtering past events:", filteredData.length)
    console.log("[v0] getFriendsAvailability - Filtered data with profiles:", filteredData.map(a => ({
      id: a.id,
      user_id: a.user_id,
      profile_name: a.profiles?.display_name,
      profile_id: a.profiles?.id
    })))

    // Fetch request status for each availability
    const availabilityWithRequests = await Promise.all(
      filteredData.map(async (avail) => {
        const startDateTime = new Date(`${avail.date}T${avail.start_time}`)
        const endDateTime = new Date(`${avail.date}T${avail.end_time}`)

        // Get request status for this availability
        const requestStatus = await getRequestStatusForAvailability(avail.id)

        return {
          id: avail.id,
          friend: {
            name: avail.profiles?.display_name || "Unknown",
            firstName: avail.profiles?.first_name || "",
            lastName: avail.profiles?.last_name || "",
            avatar: avail.profiles?.avatar_url || null,
            initials: avail.profiles?.display_name
              ? avail.profiles.display_name
                  .split(" ")
                  .map((n: string) => n[0])
                  .join("")
                  .toUpperCase()
              : "??",
            bio: "",
            mutualFriends: 0,
          },
          date: startDateTime.toLocaleDateString("en-US", {
            weekday: "long",
            month: "short",
            day: "numeric",
          }),
          time: `${startDateTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })} - ${endDateTime.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })}`,
          location: avail.location || "TBD",
          status: "available",
          isActiveNow: startDateTime <= now && endDateTime >= now,
          energy: avail.energy_level,
          tags: avail.tags || avail.activity_tags || [],
          availabilityId: avail.id,
          userId: avail.user_id,
          requestStatus: requestStatus?.status || null,
          requestId: requestStatus?.id || null,
        }
      })
    )

    return availabilityWithRequests
  } catch (error: any) {
    console.error("[v0] Error in getFriendsAvailability:", {
      message: error?.message,
      code: error?.code,
      details: error?.details,
      hint: error?.hint,
      stack: error?.stack
    })
    return []
  }
}
