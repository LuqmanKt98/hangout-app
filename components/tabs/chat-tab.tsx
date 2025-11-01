"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Inbox } from "lucide-react"
import { MessageThread } from "@/components/message-thread"
import { createClient } from "@/lib/supabase/client"
import { getReceivedRequests, getSentRequests, type RequestWithProfile } from "@/lib/api/requests"
import { useUnreadMessages } from "@/lib/hooks/use-unread-messages"

export function ChatTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [conversations, setConversations] = useState<RequestWithProfile[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RequestWithProfile | null>(null)
  const [showMessageThread, setShowMessageThread] = useState(false)
  const [userId, setUserId] = useState<string>("")
  const { unreadCounts, markAsRead } = useUnreadMessages()

  useEffect(() => {
    const supabase = createClient()
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  useEffect(() => {
    loadConversations()

    // Set up real-time subscription
    const supabase = createClient()
    const channel = supabase
      .channel("hangout_requests_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "hangout_requests",
        },
        () => {
          loadConversations()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const loadConversations = async () => {
    try {
      setIsLoading(true)
      const [received, sent] = await Promise.all([getReceivedRequests(), getSentRequests()])

      // Combine and deduplicate conversations
      const allConversations = [...received, ...sent]
      const uniqueConversations = Array.from(
        new Map(allConversations.map((conv) => [conv.id, conv])).values()
      ).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())

      setConversations(uniqueConversations)
    } catch (error) {
      console.error("Error loading conversations:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleOpenChat = (request: RequestWithProfile) => {
    setSelectedRequest(request)
    setShowMessageThread(true)
    markAsRead(request.id)
  }

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInMs = now.getTime() - date.getTime()
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60))
    const diffInDays = Math.floor(diffInHours / 24)

    if (diffInHours < 1) return "Just now"
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInDays === 1) return "1d ago"
    return `${diffInDays}d ago`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading conversations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-balance mb-2">Messages</h1>
        <p className="text-sm sm:text-base text-muted-foreground text-pretty">
          Chat with friends about your hangouts
        </p>
      </div>

      {/* Conversations List */}
      <div className="px-4 sm:px-6 space-y-2 sm:space-y-3">
        {conversations.length === 0 ? (
          <Card className="p-6 sm:p-12 text-center border-dashed">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Inbox className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-2">No conversations yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Start a conversation by sending a hangout request to a friend
            </p>
          </Card>
        ) : (
          conversations.map((request) => {
            const otherUser = request.sender_id === userId ? request.receiver : request.sender
            const unreadCount = unreadCounts[request.id] || 0

            return (
              <Card
                key={request.id}
                className="p-3 sm:p-4 border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                onClick={() => handleOpenChat(request)}
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-primary/10">
                    <AvatarImage src={otherUser.avatar_url || "/placeholder.svg"} alt={otherUser.display_name} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {otherUser?.display_name?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-sm sm:text-base text-foreground">{otherUser.display_name}</h3>
                      {unreadCount > 0 && (
                        <Badge className="bg-destructive text-white border-0 font-semibold shrink-0">
                          {unreadCount > 9 ? "9+" : unreadCount}
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                      {formatTimeAgo(request.created_at)}
                    </p>

                    <div className="flex items-center gap-2">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {request.status === "accepted" ? "Confirmed hangout" : "Hangout request"}
                      </p>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })
        )}
      </div>

      <MessageThread
        open={showMessageThread}
        onOpenChange={setShowMessageThread}
        requestId={selectedRequest?.id}
        friend={
          selectedRequest
            ? selectedRequest.sender_id === userId
              ? selectedRequest.receiver
              : selectedRequest.sender
            : { display_name: "", avatar_url: null }
        }
        hangoutDetails={
          selectedRequest
            ? {
                date: new Date(selectedRequest.request_date).toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                }),
                time: selectedRequest.start_time,
                location: (selectedRequest as any).location || "",
                status: selectedRequest.status,
              }
            : undefined
        }
        onMarkAsRead={markAsRead}
      />
    </div>
  )
}

