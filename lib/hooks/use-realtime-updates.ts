"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useRealtimeRequests(userId: string | undefined) {
  const [newRequestCount, setNewRequestCount] = useState(0)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (!userId || !supabase) return

    let channel: RealtimeChannel

    const setupSubscription = async () => {
      channel = supabase
        .channel(`requests:${userId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "hangout_requests",
            filter: `recipient_id=eq.${userId}`,
          },
          (payload) => {
            console.log("[v0] New request received:", payload)
            setNewRequestCount((prev) => prev + 1)

            // Dispatch custom event for other components
            window.dispatchEvent(new CustomEvent("newRequest", { detail: payload.new }))
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "hangout_requests",
            filter: `requester_id=eq.${userId}`,
          },
          (payload) => {
            console.log("[v0] Request status updated:", payload)

            // Dispatch custom event when your sent request is accepted/declined
            window.dispatchEvent(new CustomEvent("requestStatusChanged", { detail: payload.new }))
          },
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [userId, supabase])

  const resetCount = () => setNewRequestCount(0)

  return { newRequestCount, resetCount }
}

export function useRealtimeAvailability() {
  const [availabilityUpdated, setAvailabilityUpdated] = useState(0)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (!supabase) return

    let channel: RealtimeChannel

    const setupSubscription = async () => {
      channel = supabase
        .channel("availability_updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "availability",
          },
          (payload) => {
            console.log("[v0] Availability updated:", payload)
            setAvailabilityUpdated((prev) => prev + 1)

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent("availabilityUpdated", { detail: payload }))
          },
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase])

  return { availabilityUpdated }
}

export function useRealtimeMessages(threadId: string | undefined) {
  const [newMessageCount, setNewMessageCount] = useState(0)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (!threadId || !supabase) return

    let channel: RealtimeChannel

    const setupSubscription = async () => {
      channel = supabase
        .channel(`messages:${threadId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `thread_id=eq.${threadId}`,
          },
          (payload) => {
            console.log("[v0] New message received:", payload)
            setNewMessageCount((prev) => prev + 1)

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent("newMessage", { detail: payload.new }))
          },
        )
        .subscribe()
    }

    setupSubscription()

    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [threadId, supabase])

  const resetCount = () => setNewMessageCount(0)

  return { newMessageCount, resetCount }
}
