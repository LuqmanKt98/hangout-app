import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type RequestStatus = "pending" | "accepted" | "declined" | "cancelled"

export type HangoutRequest = {
  id: string
  sender_id: string
  receiver_id: string
  availability_id: string | null
  request_date: string
  start_time: string
  end_time: string
  message: string | null
  status: RequestStatus
  created_at: string
  updated_at: string
  // Support both old and new field names for backwards compatibility
  requested_date?: string
  requested_start_time?: string
  requested_end_time?: string
}

export type RequestWithProfile = HangoutRequest & {
  sender: {
    id: string
    display_name: string
    avatar_url: string | null
  }
  receiver: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

// Client-side functions
export async function createHangoutRequest(data: {
  receiver_id: string
  availability_id?: string
  requested_date: string
  requested_start_time: string
  requested_end_time: string
  message?: string
}) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  console.log("[v0] Creating hangout request with data:", data)

  // Check for existing pending request with the same parameters
  const { data: existingRequest } = await supabase
    .from("hangout_requests")
    .select("id")
    .eq("sender_id", user.id)
    .eq("receiver_id", data.receiver_id)
    .eq("request_date", data.requested_date)
    .eq("start_time", data.requested_start_time)
    .eq("end_time", data.requested_end_time)
    .eq("status", "pending")
    .maybeSingle()

  if (existingRequest) {
    console.log("[v0] Duplicate request detected, returning existing request:", existingRequest.id)
    throw new Error("You already have a pending request for this time slot")
  }

  const { data: request, error } = await supabase
    .from("hangout_requests")
    .insert({
      sender_id: user.id,
      receiver_id: data.receiver_id,
      availability_id: data.availability_id || null,
      request_date: data.requested_date,
      start_time: data.requested_start_time,
      end_time: data.requested_end_time,
      message: data.message || null,
      status: "pending",
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating hangout request:", error)
    throw error
  }

  console.log("[v0] Hangout request created successfully:", request)
  return request as HangoutRequest
}

export async function updateRequestStatus(requestId: string, status: RequestStatus) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("hangout_requests")
    .update({
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single()

  if (error) {
    console.error("Error updating request status:", error)
    throw new Error(error.message || "Failed to update request status")
  }

  // Dispatch event to refresh UI
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("requestStatusChanged"))
  }

  return data as HangoutRequest
}

export async function markRequestAsSeen(requestId: string) {
  const supabase = createBrowserClient()

  const { data, error} = await supabase
    .from("hangout_requests")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", requestId)
    .select()
    .single()

  if (error) throw error
  return data as HangoutRequest
}

export async function getReceivedRequests() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] getReceivedRequests: No user logged in")
      return []
    }

    console.log("[v0] getReceivedRequests: Querying for receiver_id =", user.id)

    const { data, error } = await supabase
      .from("hangout_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })

    console.log("[v0] getReceivedRequests: Query result - data:", data, "error:", error)

    if (error || !data) {
      console.log("[v0] getReceivedRequests: Error or no data returned")
      return []
    }

    console.log("[v0] getReceivedRequests: Found", data.length, "requests")

    // Get profiles for senders and receivers
    const userIds = [...new Set([...data.map((r) => r.sender_id), ...data.map((r) => r.receiver_id)])]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return data.map((req) => ({
      ...req,
      sender: profileMap.get(req.sender_id) || { id: req.sender_id, display_name: "Unknown", avatar_url: null },
      receiver: profileMap.get(req.receiver_id) || { id: req.receiver_id, display_name: "Unknown", avatar_url: null },
    })) as RequestWithProfile[]
  } catch (error) {
    console.error("Error in getReceivedRequests:", error)
    return []
  }
}

export async function getSentRequests() {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      console.log("[v0] getSentRequests: No user logged in")
      return []
    }

    console.log("[v0] getSentRequests: Querying for sender_id =", user.id)

    const { data, error } = await supabase
      .from("hangout_requests")
      .select("*")
      .eq("sender_id", user.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })

    console.log("[v0] getSentRequests: Query result - data:", data, "error:", error)

    if (error || !data) {
      console.log("[v0] getSentRequests: Error or no data returned")
      return []
    }

    console.log("[v0] getSentRequests: Found", data.length, "requests")

    // Get profiles for senders and receivers
    const userIds = [...new Set([...data.map((r) => r.sender_id), ...data.map((r) => r.receiver_id)])]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return data.map((req) => ({
      ...req,
      sender: profileMap.get(req.sender_id) || { id: req.sender_id, display_name: "Unknown", avatar_url: null },
      receiver: profileMap.get(req.receiver_id) || { id: req.receiver_id, display_name: "Unknown", avatar_url: null },
    })) as RequestWithProfile[]
  } catch (error) {
    console.error("[v0] Error in getSentRequests:", error)
    return []
  }
}

export async function deleteRequest(requestId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("hangout_requests")
    .delete()
    .eq("id", requestId)
    .select()

  if (error) {
    console.error("Error deleting request:", error)
    throw error
  }

  return data
}

export async function getRequestStatusForAvailability(availabilityId: string) {
  try {
    const supabase = createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return null

    console.log("[v0] getRequestStatusForAvailability - Checking for availability:", availabilityId, "user:", user.id)

    const { data, error } = await supabase
      .from("hangout_requests")
      .select("*")
      .eq("availability_id", availabilityId)
      .eq("sender_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error("[v0] Error fetching request status:", error)
      return null
    }

    return data as HangoutRequest | null
  } catch (error) {
    console.error("Error in getRequestStatusForAvailability:", error)
    return null
  }
}

// Server-side functions
export async function getServerReceivedRequests() {
  try {
    const supabase = await createBrowserClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return []

    const { data, error } = await supabase
      .from("hangout_requests")
      .select("*")
      .eq("receiver_id", user.id)
      .in("status", ["pending", "accepted"])
      .order("created_at", { ascending: false })

    if (error || !data) return []

    // Get profiles for senders and receivers
    const userIds = [...new Set([...data.map((r) => r.sender_id), ...data.map((r) => r.receiver_id)])]
    const { data: profiles } = await supabase.from("profiles").select("id, display_name, avatar_url").in("id", userIds)

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || [])

    return data.map((req) => ({
      ...req,
      sender: profileMap.get(req.sender_id) || { id: req.sender_id, display_name: "Unknown", avatar_url: null },
      receiver: profileMap.get(req.receiver_id) || { id: req.receiver_id, display_name: "Unknown", avatar_url: null },
    })) as RequestWithProfile[]
  } catch (error) {
    return []
  }
}
