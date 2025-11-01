"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

export function useUnreadMessages() {
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})
  const [totalUnread, setTotalUnread] = useState(0)
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  // Load initial unread counts
  useEffect(() => {
    if (!supabase) return

    const loadUnreadCounts = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        if (!user) return

        // Get all hangout requests for the user
        const { data: requests, error: requestsError } = await supabase
          .from("hangout_requests")
          .select("id")
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

        if (requestsError) {
          console.error("[v0] Error fetching requests:", requestsError)
          return
        }

        const requestIds = requests?.map((r: any) => r.id) || []
        if (requestIds.length === 0) {
          setUnreadCounts({})
          setTotalUnread(0)
          return
        }

        // Get unread message counts for each request
        const { data: unreadMessages, error: messagesError } = await supabase
          .from("request_messages")
          .select("request_id")
          .in("request_id", requestIds)
          .eq("is_read", false)
          .neq("sender_id", user.id)

        if (messagesError) {
          console.error("[v0] Error fetching unread messages:", messagesError)
          return
        }

        // Count unread messages per request
        const counts: Record<string, number> = {}
        let total = 0
        unreadMessages?.forEach((msg: any) => {
          counts[msg.request_id] = (counts[msg.request_id] || 0) + 1
          total++
        })

        setUnreadCounts(counts)
        setTotalUnread(total)
      } catch (error) {
        console.error("[v0] Error loading unread counts:", error)
      }
    }

    loadUnreadCounts()
  }, [supabase])

  // Set up real-time subscription for new messages and read status changes
  useEffect(() => {
    if (!supabase) return

    let channel: RealtimeChannel

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      channel = supabase
        .channel("request_messages_changes")
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "request_messages",
          },
          (payload) => {
            const newMessage = payload.new
            // Only increment if the message is not from the current user
            if (newMessage.sender_id !== user.id) {
              setUnreadCounts((prev) => ({
                ...prev,
                [newMessage.request_id]: (prev[newMessage.request_id] || 0) + 1,
              }))
              setTotalUnread((prev) => prev + 1)
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "request_messages",
          },
          (payload) => {
            console.log("[v0] Real-time UPDATE event received:", payload)
            const updatedMessage = payload.new
            const oldMessage = payload.old

            // If message was marked as read and it's not from the current user
            if (!oldMessage.is_read && updatedMessage.is_read && updatedMessage.sender_id !== user.id) {
              console.log("[v0] Message marked as read, updating unread counts")
              setUnreadCounts((prev) => {
                const count = prev[updatedMessage.request_id] || 0
                if (count > 0) {
                  return {
                    ...prev,
                    [updatedMessage.request_id]: count - 1,
                  }
                }
                return prev
              })
              setTotalUnread((prev) => Math.max(0, prev - 1))
            }
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

  const markAsRead = async (requestId: string) => {
    console.log("[v0] markAsRead called with requestId:", requestId)
    if (!supabase) {
      console.log("[v0] markAsRead: supabase not ready")
      return
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) {
        console.log("[v0] markAsRead: user not found")
        return
      }

      console.log("[v0] markAsRead: updating database for request:", requestId)
      // Update messages to mark as read
      const { error } = await supabase
        .from("request_messages")
        .update({ is_read: true })
        .eq("request_id", requestId)
        .eq("is_read", false)
        .neq("sender_id", user.id)

      if (error) {
        console.error("[v0] Error marking messages as read:", error)
        return
      }

      console.log("[v0] markAsRead: database updated, updating local state")
      // Update local state
      const unreadCount = unreadCounts[requestId] || 0
      console.log("[v0] markAsRead: unreadCount for request:", unreadCount)
      setUnreadCounts((prev) => {
        const updated = { ...prev }
        delete updated[requestId]
        console.log("[v0] markAsRead: new unreadCounts:", updated)
        return updated
      })
      setTotalUnread((prev) => Math.max(0, prev - unreadCount))
      console.log("[v0] markAsRead: completed successfully")
    } catch (error) {
      console.error("[v0] Error in markAsRead:", error)
    }
  }

  useEffect(() => {
    console.log("[v0] useUnreadMessages: totalUnread changed to:", totalUnread)
  }, [totalUnread])

  return {
    unreadCounts,
    totalUnread,
    markAsRead,
  }
}

