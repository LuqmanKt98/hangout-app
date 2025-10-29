import { createClient as createBrowserClient } from "@/lib/supabase/client"

export type Message = {
  id: string
  request_id: string
  sender_id: string
  message: string
  created_at: string
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

export async function markMessagesAsRead(threadId: string) {
  // No read tracking in request_messages table
  // This is a no-op for compatibility
  return Promise.resolve()
}
