import { createClient as createBrowserClient } from "@/lib/supabase/client"
import { createAvailability, shareAvailabilityWithFriends } from "./availability"
import { getUserTimezone } from "@/lib/utils/timezone"

export type EnergyLevel = "high" | "low" | "virtual"

export type Profile = {
  id: string
  display_name: string
  avatar_url: string | null
  bio: string | null
  available_now: boolean
  available_now_energy: EnergyLevel | null
  available_now_until: string | null
  created_at: string
  updated_at: string
  email: string
  first_name: string
  last_name: string
  location: string
  phone: string
  onboarding_completed: boolean
  timezone?: string
}

export async function ensureProfileExists() {
  const supabase = createBrowserClient()

  console.log("[v0] ensureProfileExists: Starting profile check")

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] ensureProfileExists: No user found")
    return null
  }

  console.log("[v0] ensureProfileExists: User found:", user.email, "ID:", user.id)
  console.log("[v0] ensureProfileExists: User metadata:", user.user_metadata)

  // Check if profile exists
  const { data: existingProfile, error: checkError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single()

  if (checkError) {
    console.log("[v0] ensureProfileExists: Error checking profile:", checkError)
  }

  if (existingProfile) {
    console.log("[v0] ensureProfileExists: Profile already exists")
    return existingProfile
  }

  // Profile doesn't exist, create it
  console.log("[v0] ensureProfileExists: Profile missing, creating new profile for:", user.email)

  const profileData = {
    id: user.id,
    email: user.email,
    display_name: user.user_metadata?.display_name || user.email?.split("@")[0] || "User",
    first_name: user.user_metadata?.first_name || "",
    last_name: user.user_metadata?.last_name || "",
    location: user.user_metadata?.location || "",
    phone: user.user_metadata?.phone || "",
    avatar_url: null,
    bio: null,
    available_now: false,
    available_now_energy: null,
    available_now_until: null,
    onboarding_completed: false,
    timezone: getUserTimezone(),
  }

  console.log("[v0] ensureProfileExists: Attempting to insert profile with data:", profileData)

  const { data: newProfile, error } = await supabase.from("profiles").insert(profileData).select().single()

  if (error) {
    console.error("[v0] ensureProfileExists: ERROR creating profile:", error)
    console.error("[v0] ensureProfileExists: Error details:", JSON.stringify(error, null, 2))
    throw error
  }

  console.log("[v0] ensureProfileExists: Profile created successfully:", newProfile)
  return newProfile
}

export async function updateProfile(updates: Partial<Profile>) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const profileUpdates = { ...updates, updated_at: new Date().toISOString() }
  if (!updates.timezone) {
    profileUpdates.timezone = getUserTimezone()
  }

  const { data, error } = await supabase.from("profiles").update(profileUpdates).eq("id", user.id).select().single()

  if (error) throw error
  return data as Profile
}

export async function setAvailableNow(
  available: boolean,
  energy?: EnergyLevel,
  durationMinutes?: number,
  friendIds?: string[],
  startTime24?: string, // HH:mm format in 24-hour time
  endTime24?: string, // HH:mm format in 24-hour time
) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  console.log("[v0] setAvailableNow:", { available, energy, durationMinutes, friendIds, startTime24, endTime24 })

  const updates: any = {
    available_now: available,
  }

  if (available && durationMinutes) {
    updates.available_now_energy = energy || "low"

    // If specific times are provided, use them; otherwise use current time + duration
    let dateStr: string
    let startTime: string
    let endTime: string

    if (startTime24 && endTime24) {
      // Use the provided times
      const now = new Date()
      dateStr = now.toISOString().split("T")[0]
      startTime = startTime24
      endTime = endTime24

      // Calculate until time for available_now_until
      const [startHour, startMin] = startTime24.split(":").map(Number)
      const [endHour, endMin] = endTime24.split(":").map(Number)
      const untilDate = new Date(now)
      untilDate.setHours(endHour, endMin, 0, 0)

      // If end time is before start time, it means it's the next day
      if (endHour < startHour || (endHour === startHour && endMin < startMin)) {
        untilDate.setDate(untilDate.getDate() + 1)
      }

      updates.available_now_until = untilDate.toISOString()
    } else {
      // Fallback to old behavior: use current time + duration
      const now = new Date()
      const until = new Date(now.getTime() + durationMinutes * 60000)
      updates.available_now_until = until.toISOString()

      dateStr = now.toISOString().split("T")[0]
      startTime = now.toTimeString().split(" ")[0].substring(0, 5) // HH:mm format
      endTime = until.toTimeString().split(" ")[0].substring(0, 5) // HH:mm format
    }

    console.log("[v0] Creating availability record:", {
      date: dateStr,
      startTime,
      endTime,
      energy,
    })

    try {
      // Check if an availability record already exists for this user, date, and time
      const { data: existingAvailability } = await supabase
        .from("availability")
        .select("id")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .maybeSingle()

      if (existingAvailability) {
        console.log("[v0] Availability already exists:", existingAvailability.id)
        // Share with specific friends if provided
        if (friendIds && friendIds.length > 0) {
          console.log("[v0] Sharing existing availability with friends:", friendIds)
          await shareAvailabilityWithFriends(existingAvailability.id, friendIds)
          console.log("[v0] Shared successfully")
        }
      } else {
        const availability = await createAvailability({
          date: dateStr,
          start_time: startTime,
          end_time: endTime,
          energy_level: energy || "low",
          activity_tags: [],
          visible_to: "friends",
          location: null,
        })

        console.log("[v0] Availability created:", availability.id)

        // Share with specific friends if provided
        if (friendIds && friendIds.length > 0) {
          console.log("[v0] Sharing with friends:", friendIds)
          await shareAvailabilityWithFriends(availability.id, friendIds)
          console.log("[v0] Shared successfully")
        }
      }
    } catch (error) {
      console.error("[v0] Error creating availability:", error)
      throw error
    }
  } else {
    updates.available_now_energy = null
    updates.available_now_until = null
  }

  const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single()

  if (error) throw error
  return data as Profile
}

export async function getAvailableNowFriends() {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Get friend IDs
  const { data: friendships, error: friendshipsError } = await supabase
    .from("friendships")
    .select("friend_id")
    .eq("user_id", user.id)
    .eq("status", "accepted")

  if (friendshipsError) throw friendshipsError

  const friendIds = friendships?.map((f) => f.friend_id) || []

  if (friendIds.length === 0) return []

  // Get profiles of friends who are available now
  const { data, error } = await supabase.from("profiles").select("*").in("id", friendIds).eq("available_now", true)

  if (error) throw error
  return (data as Profile[]) || []
}

export async function uploadAvatar(file: File): Promise<string> {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  console.log("[v0] uploadAvatar: Starting upload for user:", user.id)
  console.log("[v0] uploadAvatar: File name:", file.name, "Size:", file.size, "Type:", file.type)

  // Create a unique file name
  const fileExt = file.name.split(".").pop()
  const fileName = `${user.id}/${Date.now()}.${fileExt}`

  console.log("[v0] uploadAvatar: Uploading to path:", fileName)

  // Upload the file to Supabase Storage
  const { data, error } = await supabase.storage.from("avatars").upload(fileName, file, {
    cacheControl: "3600",
    upsert: false,
  })

  if (error) {
    console.error("[v0] uploadAvatar: Upload error:", error)
    console.error("[v0] uploadAvatar: Error details:", JSON.stringify(error, null, 2))
    throw error
  }

  console.log("[v0] uploadAvatar: Upload successful, data:", data)

  // Get the public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from("avatars").getPublicUrl(fileName)

  console.log("[v0] uploadAvatar: Public URL:", publicUrl)

  return publicUrl
}

export async function deleteAvatar(avatarUrl: string): Promise<void> {
  const supabase = createBrowserClient()

  // Extract the file path from the URL
  const urlParts = avatarUrl.split("/avatars/")
  if (urlParts.length < 2) return

  const filePath = urlParts[1]

  const { error } = await supabase.storage.from("avatars").remove([filePath])

  if (error) {
    console.error("Error deleting avatar:", error)
    // Don't throw error, just log it - we don't want to block profile updates
  }
}
