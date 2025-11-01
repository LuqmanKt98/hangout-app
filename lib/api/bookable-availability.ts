import { createClient as createBrowserClient } from "@/lib/supabase/client"
import type { EnergyLevel } from "./availability"

export type TimeSlot = {
  date: string
  start_time: string
  end_time: string
}

export type BookableAvailability = {
  id: string
  user_id: string
  title: string
  description: string | null
  activity_type: string
  energy_level: EnergyLevel
  time_slots: TimeSlot[]
  visible_to: "friends" | "everyone"
  share_token: string
  is_active: boolean
  expires_at: string
  created_at: string
  updated_at: string
}

export type BookableAvailabilityWithProfile = BookableAvailability & {
  profile: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

export type Booking = {
  id: string
  bookable_availability_id: string
  booked_by_user_id: string | null
  guest_name: string | null
  guest_contact: string | null
  selected_slot: TimeSlot
  status: "pending" | "accepted" | "declined" | "cancelled"
  hangout_request_id: string | null
  created_at: string
  updated_at: string
}

export type BookingWithProfile = Booking & {
  profile: {
    id: string
    display_name: string
    avatar_url: string | null
  } | null
}

export async function createBookableAvailability(data: {
  title: string
  description?: string
  activity_type: string
  energy_level: EnergyLevel
  time_slots: TimeSlot[]
  visible_to?: "friends" | "everyone"
  expires_in_days?: number
}) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + (data.expires_in_days || 7))

  const { data: bookableAvailability, error } = await supabase
    .from("bookable_availability")
    .insert({
      user_id: user.id,
      title: data.title,
      description: data.description || null,
      activity_type: data.activity_type,
      energy_level: data.energy_level,
      time_slots: data.time_slots,
      visible_to: data.visible_to || "friends",
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) {
    console.error("[v0] Error creating bookable availability:", error)
    throw error
  }
  return bookableAvailability as BookableAvailability
}

export async function getMyBookableAvailability() {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data, error } = await supabase
    .from("bookable_availability")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as BookableAvailability[]
}

export async function getBookableAvailabilityByToken(token: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("bookable_availability")
    .select(`
      *,
      profile:profiles(id, display_name, avatar_url)
    `)
    .eq("share_token", token)
    .eq("is_active", true)
    .gt("expires_at", new Date().toISOString())
    .single()

  if (error) throw error
  return data as BookableAvailabilityWithProfile
}

export async function updateBookableAvailability(
  id: string,
  data: Partial<Omit<BookableAvailability, "id" | "user_id" | "share_token" | "created_at" | "updated_at">>,
) {
  const supabase = createBrowserClient()

  const { data: bookableAvailability, error } = await supabase
    .from("bookable_availability")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return bookableAvailability as BookableAvailability
}

export async function deleteBookableAvailability(id: string) {
  const supabase = createBrowserClient()

  const { error } = await supabase.from("bookable_availability").delete().eq("id", id)

  if (error) throw error
}

export async function createBooking(data: {
  bookable_availability_id: string
  selected_slot: TimeSlot
  guest_name?: string
  guest_contact?: string
}) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // First, get the bookable availability to find the owner
  const { data: bookableAvail, error: availError } = await supabase
    .from("bookable_availability")
    .select("user_id, title, activity_type")
    .eq("id", data.bookable_availability_id)
    .single()

  if (availError || !bookableAvail) throw new Error("Bookable availability not found")

  // Create the booking
  const { data: booking, error } = await supabase
    .from("bookable_bookings")
    .insert({
      bookable_availability_id: data.bookable_availability_id,
      booked_by_user_id: user.id,
      time_slot: JSON.stringify(data.selected_slot),
    })
    .select()
    .single()

  if (error) throw error

  // Create a hangout_request to add the plan to the user's plans
  try {
    const { error: requestError } = await supabase
      .from("hangout_requests")
      .insert({
        sender_id: user.id,
        receiver_id: bookableAvail.user_id,
        request_date: data.selected_slot.date,
        start_time: data.selected_slot.start_time,
        end_time: data.selected_slot.end_time,
        message: `Booking from: ${bookableAvail.title}`,
        status: "accepted", // Auto-accept bookings from bookable links
      })

    if (requestError) {
      console.error("[v0] Error creating hangout request for booking:", requestError)
      // Don't throw - the booking was created successfully
    }
  } catch (err) {
    console.error("[v0] Error creating hangout request:", err)
    // Don't throw - the booking was created successfully
  }

  return booking as Booking
}

export async function getBookingsForBookableAvailability(bookableAvailabilityId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("bookable_bookings")
    .select(`
      *,
      profile:profiles(id, display_name, avatar_url)
    `)
    .eq("bookable_availability_id", bookableAvailabilityId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return (data || []) as BookingWithProfile[]
}

export async function updateBookingStatus(id: string, status: Booking["status"]) {
  const supabase = createBrowserClient()

  const { data: booking, error } = await supabase
    .from("bookable_bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return booking as Booking
}
