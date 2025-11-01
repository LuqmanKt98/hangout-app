import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type Message = {
  id: string
  request_id: string
  sender_id: string
  message: string
  created_at: string
  is_read?: boolean
}

export type MessageWithProfile = Message & {
  sender: {
    id: string
    display_name: string
    avatar_url: string | null
  }
}

// Client-side functions
export async function sendMessage(requestId: string, content: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { data: message, error } = await supabase
    .from("request_messages")
    .insert({
      request_id: requestId,
      sender_id: user.id,
      message: content.trim(),
    })
    .select()
    .single()

  if (error) throw error

  return message as Message
}

export async function getRequestMessages(requestId: string) {
  const supabase = createBrowserClient()

  const { data, error } = await supabase
    .from("request_messages")
    .select(`
      *,
      sender:profiles!request_messages_sender_id_fkey(id, display_name, avatar_url)
    `)
    .eq("request_id", requestId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data || []) as MessageWithProfile[]
}

// Compatibility functions for existing code
export async function getOrCreateThread(participantId: string, requestId?: string) {
  // For request_messages, we don't need threads - just return a mock object with the requestId
  if (!requestId) throw new Error("Request ID is required for messaging")
  return { id: requestId, request_id: requestId }
}

export async function getThreadMessages(threadId: string) {
  // threadId is actually the requestId in the new system
  return getRequestMessages(threadId)
}

export async function markMessagesAsRead(requestId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  // Mark all unread messages from other users as read
  const { error } = await supabase
    .from("request_messages")
    .update({ is_read: true })
    .eq("request_id", requestId)
    .eq("is_read", false)
    .neq("sender_id", user.id)

  if (error) {
    console.error("[v0] Error marking messages as read:", error)
    throw error
  }

  return Promise.resolve()
}

export async function getUnreadMessageCount(requestId: string) {
  const supabase = createBrowserClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const { count, error } = await supabase
    .from("request_messages")
    .select("*", { count: "exact", head: true })
    .eq("request_id", requestId)
    .eq("is_read", false)
    .neq("sender_id", user.id)

  if (error) {
    console.error("[v0] Error getting unread count:", error)
    return 0
  }

  return count || 0
}
