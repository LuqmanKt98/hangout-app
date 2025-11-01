"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar, MapPin, X, Check, Inbox, Flame, Moon, Monitor, ArrowRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { formatTime12Hour } from "@/lib/utils/timezone"
import {
  getReceivedRequests,
  getSentRequests,
  updateRequestStatus,
  markRequestAsSeen,
  type RequestWithProfile,
} from "@/lib/api/requests"
import { type EnergyLevel } from "@/lib/api/availability"
import { getReceivedFriendRequests, getSentFriendRequests, acceptFriendRequest, declineFriendRequest } from "@/lib/api/friends"
import { createClient } from "@/lib/supabase/client"
import { useUnreadMessages } from "@/lib/hooks/use-unread-messages"

export function RequestsTab() {
  console.log("[v0] RequestsTab: Component rendered")
  const [isLoading, setIsLoading] = useState(true)
  const [activeView, setActiveView] = useState<"received" | "sent">("received")
  const [receivedRequests, setReceivedRequests] = useState<RequestWithProfile[]>([])
  const [sentRequests, setSentRequests] = useState<RequestWithProfile[]>([])
  const [receivedFriendRequests, setReceivedFriendRequests] = useState<any[]>([])
  const [sentFriendRequests, setSentFriendRequests] = useState<any[]>([])
  const [selectedRequest, setSelectedRequest] = useState<RequestWithProfile | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showDeclineDialog, setShowDeclineDialog] = useState(false)
  const [requestToDecline, setRequestToDecline] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [requestToDelete, setRequestToDelete] = useState<string | null>(null)
  const [showClearAllDialog, setShowClearAllDialog] = useState(false)
  const [clearType, setClearType] = useState<'sent' | 'received' | null>(null)
  const { toast } = useToast()
  const { unreadCounts, totalUnread, markAsRead } = useUnreadMessages()

  useEffect(() => {
    console.log("[v0] RequestsTab: useEffect called, loading requests")
    loadRequests()

    // Set up real-time subscription for hangout requests
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
        (payload) => {
          console.log("[v0] RequestsTab: Real-time update received:", payload)
          // Reload requests when any change occurs
          loadRequests()
        }
      )
      .subscribe()

    return () => {
      console.log("[v0] RequestsTab: Cleaning up real-time subscription")
      supabase.removeChannel(channel)
    }
  }, [])

  const loadRequests = async () => {
    try {
      console.log("[v0] RequestsTab: loadRequests called")
      setIsLoading(true)
      const [received, sent, receivedFriends, sentFriends] = await Promise.all([
        getReceivedRequests(),
        getSentRequests(),
        getReceivedFriendRequests(),
        getSentFriendRequests(),
      ])
      console.log("[v0] RequestsTab: Received requests:", received)
      console.log("[v0] RequestsTab: Sent requests:", sent)
      setReceivedRequests(received)
      setSentRequests(sent)
      setReceivedFriendRequests(receivedFriends)
      setSentFriendRequests(sentFriends)
    } catch (error) {
      console.error("Error loading requests:", error)
      toast({
        title: "Failed to load requests",
        description: "Please try refreshing the page.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const energyLevels = {
    high: {
      label: "High Energy",
      icon: Flame,
      color: "text-energy-high",
      bgColor: "bg-energy-high/10",
      borderColor: "border-energy-high/20",
    },
    low: {
      label: "Low Energy",
      icon: Moon,
      color: "text-energy-low",
      bgColor: "bg-energy-low/10",
      borderColor: "border-energy-low/20",
    },
    virtual: {
      label: "Virtual",
      icon: Monitor,
      color: "text-primary",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
  }

  const getEnergyConfig = (energy: EnergyLevel | undefined) => {
    if (!energy) {
      return energyLevels.low // Default to low energy if not specified
    }
    return energyLevels[energy]
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

  const handleAccept = async (requestId: string) => {
    try {
      await updateRequestStatus(requestId, "accepted")

      toast({
        title: "Accepted! Hangout added to your plans",
        description: "Your hangout has been confirmed. Go to Plans tab to see it.",
        duration: 5000,
      })

      loadRequests()
      window.dispatchEvent(new Event("plansUpdated"))
    } catch (error: any) {
      toast({
        title: "Failed to accept request",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDecline = (requestId: string) => {
    setRequestToDecline(requestId)
    setShowDeclineDialog(true)
  }

  const confirmDecline = async () => {
    if (!requestToDecline) return

    try {
      await updateRequestStatus(requestToDecline, "rejected")

      toast({
        title: "Request declined",
        description: "The request has been declined.",
      })

      setShowDeclineDialog(false)
      setRequestToDecline(null)
      loadRequests()
    } catch (error: any) {
      toast({
        title: "Failed to decline request",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRequest = (requestId: string) => {
    setRequestToDelete(requestId)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!requestToDelete) return

    try {
      const { deleteRequest } = await import("@/lib/api/requests")
      const result = await deleteRequest(requestToDelete)

      if (result && result.length > 0) {
        toast({
          title: "Request deleted",
          description: "Your request has been removed.",
        })
        setShowDeleteDialog(false)
        setRequestToDelete(null)
        loadRequests()
      } else {
        // Deletion returned empty result - might have been blocked by RLS
        console.warn("[v0] confirmDelete: Delete returned empty result for request:", requestToDelete)
        toast({
          title: "Failed to delete request",
          description: "You may not have permission to delete this request.",
          variant: "destructive",
        })
      }
    } catch (error: any) {
      console.error("[v0] confirmDelete: Error deleting request:", error)
      toast({
        title: "Failed to delete request",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleClearAll = (type: 'sent' | 'received') => {
    setClearType(type)
    setShowClearAllDialog(true)
  }

  const confirmClearAll = async () => {
    if (!clearType) return

    try {
      const { deleteRequest } = await import("@/lib/api/requests")
      const requestsToDelete = clearType === 'sent' ? sentRequests : receivedRequests

      // Only delete accepted or rejected requests, not pending ones
      const nonPendingRequests = requestsToDelete.filter(req => req.status !== 'pending')

      let successCount = 0
      let failedCount = 0
      const errors: string[] = []

      for (const request of nonPendingRequests) {
        try {
          const result = await deleteRequest(request.id)
          if (result && result.length > 0) {
            successCount++
          } else {
            // Deletion returned empty result - might have been blocked by RLS
            failedCount++
            console.warn("[v0] confirmClearAll: Delete returned empty result for request:", request.id)
          }
        } catch (error: any) {
          failedCount++
          errors.push(error.message || "Unknown error")
          console.error("[v0] confirmClearAll: Failed to delete request:", request.id, error)
        }
      }

      if (successCount > 0 && failedCount === 0) {
        toast({
          title: "Requests cleared",
          description: `${successCount} ${clearType} request${successCount !== 1 ? 's' : ''} removed.`,
        })
      } else if (successCount > 0 && failedCount > 0) {
        toast({
          title: "Partially cleared",
          description: `${successCount} removed, ${failedCount} failed. Some requests may not be deletable.`,
          variant: "destructive",
        })
      } else {
        toast({
          title: "Failed to clear requests",
          description: failedCount > 0 ? `Could not delete ${failedCount} request${failedCount !== 1 ? 's' : ''}. You may not have permission to delete these requests.` : "No requests to delete.",
          variant: "destructive",
        })
      }

      setShowClearAllDialog(false)
      setClearType(null)
      loadRequests()
    } catch (error: any) {
      toast({
        title: "Failed to clear requests",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleViewDetails = async (request: RequestWithProfile) => {
    setSelectedRequest(request)
    setShowDetailModal(true)

    // Mark as seen if it's a received request and hasn't been seen yet
    if (!request.seen_at && receivedRequests.find((r) => r.id === request.id)) {
      try {
        await markRequestAsSeen(request.id)
        loadRequests()
      } catch (error) {
        console.error("Error marking request as seen:", error)
      }
    }
  }

  const handleViewPlans = () => {
    window.dispatchEvent(new CustomEvent("switchTab", { detail: "plans" }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-balance">Requests</h1>
          {activeView === 'received' && receivedRequests.filter(r => r.status !== 'pending').length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleClearAll('received')}
            >
              Clear All
            </Button>
          )}
          {activeView === 'sent' && sentRequests.filter(r => r.status !== 'pending').length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => handleClearAll('sent')}
            >
              Clear All
            </Button>
          )}
        </div>
        <p className="text-sm sm:text-base text-muted-foreground text-pretty">Manage your hangout invitations</p>
      </div>

      {/* Tabs */}
      <div className="px-4 sm:px-6 mb-4 sm:mb-6">
        <Tabs value={activeView} onValueChange={(v) => setActiveView(v as "received" | "sent")} className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-background/50 p-1 h-auto">
            <TabsTrigger
              value="received"
              className="rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 transition-colors"
            >
              Received
              {(receivedRequests.filter((r) => r.status === "pending").length + receivedFriendRequests.length) > 0 && (
                <Badge className="ml-2 bg-energy-low text-background border-0 font-semibold">
                  {receivedRequests.filter((r) => r.status === "pending").length + receivedFriendRequests.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="sent"
              className="rounded-lg text-muted-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground py-2.5 transition-colors"
            >
              Sent
            </TabsTrigger>
          </TabsList>

          <TabsContent value="received" className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
            {receivedRequests.length === 0 && receivedFriendRequests.length === 0 ? (
              <Card className="p-6 sm:p-12 text-center border-dashed">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <Inbox className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-2">No pending requests</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  When friends send you hangout requests or friend requests, they'll appear here
                </p>
              </Card>
            ) : (
              receivedRequests.map((request) => {
                const energyConfig = getEnergyConfig((request as any).energy_level)
                const EnergyIcon = energyConfig.icon

                return (
                  <Card
                    key={request.id}
                    className="p-3 sm:p-4 border-border/50 hover:shadow-lg transition-all duration-300 cursor-pointer"
                    onClick={() => handleViewDetails(request)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4 mb-3 sm:mb-4">
                      <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-primary/10">
                        <AvatarImage
                          src={request.sender.avatar_url || "/placeholder.svg"}
                          alt={request.sender.display_name}
                        />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {request?.sender?.display_name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <div>
                            <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                              {request.sender.display_name}
                            </h3>
                            <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                              <span>{formatTimeAgo(request.created_at)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="mb-2 sm:mb-3">
                          <Badge
                            variant="outline"
                            className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor}`}
                          >
                            <EnergyIcon className="w-3 h-3 mr-1" />
                            {energyConfig.label}
                          </Badge>
                        </div>

                        <div className="space-y-1.5 mb-2 sm:mb-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm">
                            <Calendar className="w-4 h-4 text-muted-foreground" />
                            <span className="font-medium">
                              {new Date(request.request_date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}{" "}
                              at {formatTime12Hour(request.start_time)} - {formatTime12Hour(request.end_time)}
                            </span>
                          </div>
                          {(request as any).location && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{(request as any).location}</span>
                            </div>
                          )}
                        </div>

                        {(request as any).tags && (request as any).tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
                            {(request as any).tags.map((tag: string, index: number) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {request.message && (
                          <div className="bg-muted/50 rounded-xl p-3 sm:p-4 mb-4 sm:mb-5">
                            <p className="text-sm sm:text-base text-foreground">{request.message}</p>
                          </div>
                        )}

                        {request.status === "pending" && (
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                              onClick={() => handleAccept(request.id)}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              onClick={() => handleDecline(request.id)}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>

                          </div>
                        )}

                        {request.status === "accepted" && (
                          <div className="flex items-center gap-2 text-sm sm:text-base text-energy-high">
                            <Check className="w-4 h-4" />
                            <span>Accepted - Added to your plans</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                )
              })
            )}

            {/* Friend Requests Section */}
            {receivedFriendRequests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Friend Requests</h3>
                <div className="space-y-2 sm:space-y-3">
                  {receivedFriendRequests.map((request) => (
                    <Card key={request.id} className="p-3 sm:p-4 border-border/50 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-primary/10">
                          <AvatarImage
                            src={request.sender?.avatar_url || "/placeholder.svg"}
                            alt={request.sender?.display_name}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {request?.sender?.display_name?.substring(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                                {request.sender?.display_name}
                              </h3>
                            </div>
                          </div>

                          <p className="text-xs sm:text-sm text-muted-foreground mb-3">
                            Sent {formatTimeAgo(request.created_at)}
                          </p>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1 bg-primary hover:bg-primary/90"
                              onClick={async () => {
                                try {
                                  await acceptFriendRequest(request.id)
                                  toast({
                                    title: "Friend request accepted",
                                    description: `${request.sender?.display_name} is now your friend!`,
                                  })
                                  loadRequests()
                                } catch (error: any) {
                                  toast({
                                    title: "Failed to accept request",
                                    description: error.message,
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <Check className="w-4 h-4 mr-1" />
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                              onClick={async () => {
                                try {
                                  await declineFriendRequest(request.id)
                                  toast({
                                    title: "Friend request declined",
                                  })
                                  loadRequests()
                                } catch (error: any) {
                                  toast({
                                    title: "Failed to decline request",
                                    description: error.message,
                                    variant: "destructive",
                                  })
                                }
                              }}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Decline
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sent" className="mt-4 sm:mt-6 space-y-2 sm:space-y-3">
            {sentRequests.length === 0 && sentFriendRequests.length === 0 ? (
              <Card className="p-6 sm:p-12 text-center border-dashed">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
                  <Inbox className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-base sm:text-lg mb-2">No sent requests</h3>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Requests you send to friends will appear here
                </p>
              </Card>
            ) : (
              sentRequests.map((request) => {
                const energyConfig = getEnergyConfig((request as any).energy_level)
                const EnergyIcon = energyConfig.icon

                return (
                  <Card
                    key={request.id}
                    className="p-3 sm:p-4 border-border/50 cursor-pointer hover:shadow-lg transition-all"
                    onClick={() => handleViewDetails(request)}
                  >
                    <div className="flex items-start gap-3 sm:gap-4">
                      <Avatar className="w-10 h-10 sm:w-12 sm:h-12">
                        <AvatarImage
                          src={request.receiver.avatar_url || "/placeholder.svg"}
                          alt={request.receiver.display_name}
                        />
                        <AvatarFallback className="bg-muted text-muted-foreground font-semibold">
                          {request?.receiver?.display_name?.substring(0, 2).toUpperCase() || "??"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm sm:text-base text-foreground">
                            {request.receiver.display_name}
                          </h3>
                          <Badge
                            variant="secondary"
                            className={
                              request.status === "accepted"
                                ? "bg-energy-high/10 text-energy-high border-energy-high/20"
                                : "bg-muted"
                            }
                          >
                            {request.status === "accepted" ? "Accepted" : "Pending"}
                          </Badge>
                        </div>

                        {request.status === "accepted" && (
                          <p className="text-sm sm:text-base text-energy-high mb-2 flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" />
                            Added to your plans
                          </p>
                        )}

                        {request.seen_at && request.status === "pending" && (
                          <p className="text-xs sm:text-sm text-muted-foreground mb-2">
                            Seen {formatTimeAgo(request.seen_at)}
                          </p>
                        )}

                        <div className="mb-2 sm:mb-3">
                          <Badge
                            variant="outline"
                            className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor}`}
                          >
                            <EnergyIcon className="w-3 h-3 mr-1" />
                            {energyConfig.label}
                          </Badge>
                        </div>

                        <div className="space-y-1.5 mb-2 sm:mb-3">
                          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                            <Calendar className="w-4 h-4" />
                            <span>
                              {new Date(request.request_date).toLocaleDateString("en-US", {
                                weekday: "long",
                                month: "long",
                                day: "numeric",
                              })}{" "}
                              at {formatTime12Hour(request.start_time)} - {formatTime12Hour(request.end_time)}
                            </span>
                          </div>
                          {(request as any).location && (
                            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                              <span>{(request as any).location}</span>
                            </div>
                          )}
                        </div>

                        {(request as any).tags && (request as any).tags.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mb-2 sm:mb-3">
                            {(request as any).tags.map((tag: string, index: number) => (
                              <Badge
                                key={index}
                                variant="secondary"
                                className="bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1"
                              >
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {request.message && (
                          <div className="p-3 sm:p-4 bg-muted/50 rounded-lg mb-3 sm:mb-4">
                            <div className="text-xs sm:text-sm text-muted-foreground mb-1">Your message</div>
                            <p className="text-foreground text-sm sm:text-base">{request.message}</p>
                          </div>
                        )}

                        {request.status === "accepted" && (
                          <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mb-2 sm:mb-3"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewPlans()
                            }}
                          >
                            View in Plans
                            <ArrowRight className="w-4 h-4 ml-1 sm:ml-2" />
                          </Button>
                        )}

                        {request.status === "pending" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full bg-transparent hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 mb-2 sm:mb-3"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDeleteRequest(request.id)
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel Request
                          </Button>
                        )}

                        <p className="text-xs sm:text-sm text-muted-foreground">
                          Sent {formatTimeAgo(request.created_at)}
                        </p>
                      </div>
                    </div>
                  </Card>
                )
              })
            )}

            {/* Sent Friend Requests Section */}
            {sentFriendRequests.length > 0 && (
              <div className="mt-6 pt-6 border-t border-border/50">
                <h3 className="font-semibold text-sm mb-3 text-muted-foreground">Friend Requests Sent</h3>
                <div className="space-y-2 sm:space-y-3">
                  {sentFriendRequests.map((request) => (
                    <Card key={request.id} className="p-3 sm:p-4 border-border/50 hover:shadow-lg transition-all">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-primary/10">
                          <AvatarImage
                            src={request.receiver?.avatar_url || "/placeholder.svg"}
                            alt={request.receiver?.display_name}
                          />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {request?.receiver?.display_name?.substring(0, 2).toUpperCase() || "??"}
                          </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <h3 className="font-semibold text-sm sm:text-base text-foreground">
                                {request.receiver?.display_name}
                              </h3>
                            </div>
                            <Badge variant="secondary" className="bg-muted">
                              Pending
                            </Badge>
                          </div>

                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Sent {formatTimeAgo(request.created_at)}
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={showDetailModal} onOpenChange={setShowDetailModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {selectedRequest && (
              <>
                <div className="flex items-center gap-4 sm:gap-5">
                  <Avatar className="w-16 h-16 sm:w-20 sm:h-20">
                    <AvatarImage
                      src={
                        (activeView === "received" ? selectedRequest.sender : selectedRequest.receiver).avatar_url ||
                        "/placeholder.svg"
                      }
                      alt={(activeView === "received" ? selectedRequest.sender : selectedRequest.receiver).display_name}
                    />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(activeView === "received" ? selectedRequest.sender : selectedRequest.receiver)?.display_name
                        ?.substring(0, 2)
                        .toUpperCase() || "??"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg sm:text-xl">
                      {(activeView === "received" ? selectedRequest.sender : selectedRequest.receiver).display_name}
                    </h3>
                    <p className="text-sm sm:text-base text-muted-foreground">
                      {formatTimeAgo(selectedRequest.created_at)}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-4 sm:p-5 bg-muted/30 rounded-lg">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    <div>
                      <div className="text-sm sm:text-base text-muted-foreground">When</div>
                      <div className="font-medium sm:font-semibold">
                        {new Date(selectedRequest.request_date).toLocaleDateString("en-US", {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}{" "}
                        at {formatTime12Hour(selectedRequest.start_time)} - {formatTime12Hour(selectedRequest.end_time)}
                      </div>
                    </div>
                  </div>
                  {(selectedRequest as any).location && (
                    <div className="flex items-center gap-3 sm:gap-4">
                      <MapPin className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                      <div>
                        <div className="text-sm sm:text-base text-muted-foreground">Where</div>
                        <div className="font-medium sm:font-semibold">{(selectedRequest as any).location}</div>
                      </div>
                    </div>
                  )}
                </div>

                {(selectedRequest as any).tags && (selectedRequest as any).tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 sm:gap-2">
                    {(selectedRequest as any).tags.map((tag: string, index: number) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 text-xs sm:text-sm px-2 py-0.5 sm:px-2.5 sm:py-1"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                )}


              </>
            )}
          </div>
        </DialogContent>
      </Dialog>



      <AlertDialog open={showDeclineDialog} onOpenChange={setShowDeclineDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Decline request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to decline this hangout request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDecline}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Decline Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete request?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this hangout request? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete Request
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showClearAllDialog} onOpenChange={setShowClearAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear all {clearType} requests?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to clear all {clearType} requests? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmClearAll}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
