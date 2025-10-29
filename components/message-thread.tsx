"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Send, Clock, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  getOrCreateThread,
  sendMessage,
  getThreadMessages,
  markMessagesAsRead,
  type MessageWithProfile,
} from "@/lib/api/messages"

interface MessageThreadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  threadId?: string
  friendId?: string
  requestId?: string
  friend: {
    display_name: string
    avatar_url?: string | null
  }
  hangoutDetails?: {
    date: string
    time: string
    location: string
    status?: string
  }
}

export function MessageThread({
  open,
  onOpenChange,
  threadId: initialThreadId,
  friendId,
  requestId,
  friend,
  hangoutDetails,
}: MessageThreadProps) {
  const [threadId, setThreadId] = useState<string | undefined>(initialThreadId)
  const [messages, setMessages] = useState<MessageWithProfile[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (supabase) {
      loadCurrentUser()
    }
  }, [supabase])

  useEffect(() => {
    if (open && requestId) {
      initializeThread()
    }
  }, [open, requestId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (!requestId || !supabase) return

    const channel = supabase
      .channel(`request_messages:${requestId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${requestId}`,
        },
        (payload) => {
          loadMessages()
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [requestId, supabase])

  const loadCurrentUser = async () => {
    if (!supabase) return
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      setCurrentUserId(user.id)
    }
  }

  const initializeThread = async () => {
    try {
      if (requestId) {
        // Use requestId directly - no need to create threads
        setThreadId(requestId)
        await loadMessages()
        await markMessagesAsRead(requestId)
      }
    } catch (error) {
      console.error("Error initializing thread:", error)
      toast({
        title: "Error loading messages",
        description: "Please try again.",
        variant: "destructive",
      })
    }
  }

  const loadMessages = async () => {
    if (!requestId) return

    try {
      const data = await getThreadMessages(requestId)
      setMessages(data)
    } catch (error) {
      console.error("Error loading messages:", error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSendMessage = async () => {
    console.log("[v0] handleSendMessage called", { newMessage, requestId, hasMessage: !!newMessage.trim() })
    if (!newMessage.trim() || !requestId) {
      console.log("[v0] handleSendMessage: Early return", { hasMessage: !!newMessage.trim(), hasRequestId: !!requestId })
      return
    }

    setIsLoading(true)

    try {
      console.log("[v0] handleSendMessage: Calling sendMessage", { requestId, message: newMessage })
      await sendMessage(requestId, newMessage)
      setNewMessage("")
      await loadMessages()

      toast({
        title: "Message sent",
        description: `Your message was sent to ${friend.display_name}`,
      })
    } catch (error: any) {
      console.error("[v0] Error sending message:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to send message. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60)

    if (diffInHours < 24) {
      return date.toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border/50">
          <div className="flex items-center gap-3">
            <Avatar className="w-12 h-12 ring-2 ring-primary/10">
              <AvatarImage src={friend.avatar_url || "/placeholder.svg"} alt={friend.display_name} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {friend?.display_name?.substring(0, 2).toUpperCase() || "??"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <SheetTitle className="text-lg">{friend.display_name}</SheetTitle>
              <SheetDescription className="text-xs">
                {hangoutDetails?.status === "accepted" ? "Confirmed hangout" : "Hangout request"}
              </SheetDescription>
            </div>
          </div>

          {hangoutDetails && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">
                  {hangoutDetails.date} at {hangoutDetails.time}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{hangoutDetails.location}</span>
              </div>
              {hangoutDetails.status && (
                <Badge
                  variant="secondary"
                  className={
                    hangoutDetails.status === "accepted"
                      ? "bg-energy-high/10 text-energy-high border-energy-high/20"
                      : "bg-muted"
                  }
                >
                  {hangoutDetails.status === "accepted" ? "Confirmed" : "Pending"}
                </Badge>
              )}
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-muted mb-4 flex items-center justify-center">
                <Send className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-semibold mb-2">No messages yet</h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Start the conversation by sending a message about your hangout
              </p>
            </div>
          ) : (
            <>
              {messages.map((message) => {
                const isCurrentUser = message.sender_id === currentUserId
                const senderName = message.sender?.display_name || "Unknown"

                return (
                  <div key={message.id} className={`flex flex-col ${isCurrentUser ? "items-end" : "items-start"}`}>
                    <p className={`text-xs mb-1 px-1 ${isCurrentUser ? "text-muted-foreground" : "text-muted-foreground"}`}>
                      {isCurrentUser ? "You" : senderName}
                    </p>
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        isCurrentUser
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted text-foreground rounded-bl-sm"
                      }`}
                    >
                      <p className="text-sm leading-relaxed break-words">{message.message}</p>
                      <p className={`text-xs mt-1 ${isCurrentUser ? "text-white/70" : "text-muted-foreground"}`}>
                        {formatTime(message.created_at)}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border/50">
          <div className="flex gap-2">
            <Textarea
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyDown={handleKeyPress}
              rows={2}
              className="resize-none"
              disabled={isLoading}
            />
            <Button
              size="icon"
              className="bg-primary hover:bg-primary/90 shrink-0 h-auto"
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || isLoading}
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Press Enter to send, Shift+Enter for new line</p>
        </div>
      </SheetContent>
    </Sheet>
  )
}
