"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, MapPin, Users, Flame, Moon, Monitor, CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "@/components/ui/use-toast"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { MessageSquare } from "lucide-react"
import { MessageThread } from "@/components/message-thread"
import { getConfirmedPlans, getFriendsAvailability } from "@/lib/api/plans"
import { createHangoutRequest, getRequestStatusForAvailability } from "@/lib/api/requests"
import { createClient as createBrowserClient } from "@/lib/supabase/client"

type EnergyLevel = "high" | "low" | "virtual"

export function PlansTab() {
  const [selectedFriend, setSelectedFriend] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [showDayModal, setShowDayModal] = useState(false)
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [requestMessage, setRequestMessage] = useState("")
  const [requestStartTime, setRequestStartTime] = useState("")
  const [requestEndTime, setRequestEndTime] = useState("")
  const [selectedAvailability, setSelectedAvailability] = useState<any>(null)
  const [selectedWeekStart, setSelectedWeekStart] = useState(new Date())
  const [confirmedPlans, setConfirmedPlans] = useState<any[]>([])
  const [friendsAvailability, setFriendsAvailability] = useState<any[]>([])
  const [showCalendarPicker, setShowCalendarPicker] = useState(false)
  const [friendHangoutsCount, setFriendHangoutsCount] = useState(0)
  const [friendGroupsCount, setFriendGroupsCount] = useState(0)
  const [friendRequestStatus, setFriendRequestStatus] = useState<string | null>(null)
  const [showMessageThread, setShowMessageThread] = useState(false)
  const [messageThreadId, setMessageThreadId] = useState("")
  const [messageThreadRequestId, setMessageThreadRequestId] = useState<string | undefined>(undefined)
  const [messageThreadFriend, setMessageThreadFriend] = useState<any>(null)
  const [messageThreadDetails, setMessageThreadDetails] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    console.log("[v0] PlansTab: loadData called")
    try {
      setLoading(true)
      console.log("[v0] PlansTab: Calling getConfirmedPlans and getFriendsAvailability")
      const [plans, availability] = await Promise.all([getConfirmedPlans(), getFriendsAvailability()])
      console.log("[v0] PlansTab: Got plans:", plans, "availability:", availability)
      setConfirmedPlans(plans)
      setFriendsAvailability(availability)
    } catch (error: any) {
      console.error("[v0] Error loading plans data:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })
      toast({
        title: "Error loading data",
        description: "Please try refreshing the page",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const handleRequestUpdate = () => {
      console.log("[v0] Request updated, refreshing plans...")
      loadData()
    }

    const handleAvailabilityUpdate = () => {
      console.log("[v0] Availability updated, refreshing data...")
      loadData()
    }

    const handlePlansUpdate = () => {
      console.log("[v0] Plans updated, refreshing data...")
      loadData()
    }

    window.addEventListener("requestStatusChanged", handleRequestUpdate)
    window.addEventListener("availabilityUpdated", handleAvailabilityUpdate)
    window.addEventListener("plansUpdated", handlePlansUpdate)

    return () => {
      window.removeEventListener("requestStatusChanged", handleRequestUpdate)
      window.removeEventListener("availabilityUpdated", handleAvailabilityUpdate)
      window.removeEventListener("plansUpdated", handlePlansUpdate)
    }
  }, [])

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(selectedWeekStart)
    date.setDate(selectedWeekStart.getDate() + i)
    return date
  })

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
      color: "text-foreground",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/20",
    },
  }

  const getEnergyConfig = (energy: EnergyLevel) => {
    return energyLevels[energy]
  }

  const getPlansForDay = (date: Date) => {
    if (!date || !confirmedPlans) return []

    // Convert the selected date to YYYY-MM-DD format in LOCAL timezone (not UTC)
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const selectedDateStr = `${year}-${month}-${day}`

    return confirmedPlans.filter((plan) => {
      try {
        if (!plan) return false

        // Use dateString if available (preferred), otherwise fall back to date comparison
        if ((plan as any).dateString) {
          return (plan as any).dateString === selectedDateStr
        }

        // Fallback to date comparison (legacy)
        if (!plan.date) return false
        const planDate = typeof plan.date === "string" ? new Date(plan.date) : plan.date

        // Check if date is valid
        if (isNaN(planDate.getTime())) return false

        return (
          planDate.getDate() === date.getDate() &&
          planDate.getMonth() === date.getMonth() &&
          planDate.getFullYear() === date.getFullYear()
        )
      } catch (error) {
        console.error("[v0] Error filtering plans for day:", error)
        return false
      }
    })
  }

  const getPlansCountForDay = (date: Date) => {
    return getPlansForDay(date).length
  }

  const handleDayClick = (date: Date) => {
    setSelectedDay(date)
    setShowDayModal(true)
  }

  const handleSendRequest = (friend: any, availability?: any) => {
    console.log("[v0] handleSendRequest called", { friend, availability })
    setSelectedFriend(friend)
    setSelectedAvailability(availability)
    setRequestMessage("")

    if (availability && availability.time) {
      // Parse the time string (e.g., "6:00 PM - 9:00 PM")
      const timeMatch = availability.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/)

      if (timeMatch) {
        const [_, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch

        // Convert to 24-hour format
        let start24Hour = Number.parseInt(startHour)
        if (startPeriod === "PM" && start24Hour !== 12) start24Hour += 12
        if (startPeriod === "AM" && start24Hour === 12) start24Hour = 0

        let end24Hour = Number.parseInt(endHour)
        if (endPeriod === "PM" && end24Hour !== 12) end24Hour += 12
        if (endPeriod === "AM" && end24Hour === 12) end24Hour = 0

        const startTimeValue = `${start24Hour.toString().padStart(2, "0")}:${startMin}`
        const endTimeValue = `${end24Hour.toString().padStart(2, "0")}:${endMin}`

        console.log("[v0] Parsed times:", { startTimeValue, endTimeValue })
        setRequestStartTime(startTimeValue)
        setRequestEndTime(endTimeValue)
      } else {
        console.log("[v0] Failed to parse time string:", availability.time)
        setRequestStartTime("")
        setRequestEndTime("")
      }
    } else {
      console.log("[v0] No availability time provided")
      setRequestStartTime("")
      setRequestEndTime("")
    }

    setShowRequestModal(true)
  }

  const loadFriendStats = async (friendId: string) => {
    try {
      const supabase = createBrowserClient()

      // Get hangouts count for this friend
      const { data: hangouts } = await supabase
        .from("hangout_requests")
        .select("id", { count: "exact" })
        .eq("status", "accepted")
        .or(`sender_id.eq.${friendId},receiver_id.eq.${friendId}`)

      setFriendHangoutsCount(hangouts?.length || 0)

      // Get groups count for this friend
      const { data: groupMemberships } = await supabase
        .from("group_members")
        .select("group_id")
        .eq("user_id", friendId)

      setFriendGroupsCount(groupMemberships?.length || 0)

      // Get request status if there's an active availability
      // We'll check for any pending/accepted requests with this friend
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: requests } = await supabase
          .from("hangout_requests")
          .select("status")
          .eq("sender_id", user.id)
          .eq("receiver_id", friendId)
          .order("created_at", { ascending: false })
          .limit(1)

        setFriendRequestStatus(requests?.[0]?.status || null)
      }
    } catch (error) {
      console.error("[v0] Error loading friend stats:", error)
      setFriendHangoutsCount(0)
      setFriendGroupsCount(0)
      setFriendRequestStatus(null)
    }
  }

  const handleViewProfile = async (friend: any) => {
    setSelectedFriend(friend)
    setShowProfileModal(true)

    // Load friend stats when opening profile
    // Extract friend ID from the friend object
    const friendId = friend.id || friend.userId
    if (friendId) {
      await loadFriendStats(friendId)
    }
  }

  const generateTimeOptions = (startTime?: string, endTime?: string) => {
    const times = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`
        const displayTime = new Date(`2000-01-01T${timeString}`).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        })
        times.push({ value: timeString, label: displayTime })
      }
    }
    return times
  }

  const submitRequest = async () => {
    console.log("[v0] Submit request clicked", {
      requestStartTime,
      requestEndTime,
      selectedFriend,
      selectedAvailability,
    })

    if (!requestStartTime || !requestEndTime) {
      toast({
        title: "Missing time",
        description: "Please select both start and end times for your hangout.",
        variant: "destructive",
      })
      return
    }

    if (selectedAvailability && selectedAvailability.time) {
      const timeMatch = selectedAvailability.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM)/)
      if (timeMatch) {
        const [_, startHour, startMin, startPeriod, endHour, endMin, endPeriod] = timeMatch

        let availStart24 = Number.parseInt(startHour)
        if (startPeriod === "PM" && availStart24 !== 12) availStart24 += 12
        if (startPeriod === "AM" && availStart24 === 12) availStart24 = 0

        let availEnd24 = Number.parseInt(endHour)
        if (endPeriod === "PM" && availEnd24 !== 12) availEnd24 += 12
        if (endPeriod === "AM" && availEnd24 === 12) availEnd24 = 0

        const availStartTime = `${availStart24.toString().padStart(2, "0")}:${startMin}`
        const availEndTime = `${availEnd24.toString().padStart(2, "0")}:${endMin}`

        // Handle midnight-crossing availability (e.g., 23:00 - 01:00)
        const availCrossesMidnight = availEnd24 < availStart24
        const requestCrossesMidnight = requestEndTime < requestStartTime

        // For midnight-crossing availability, allow requests that also cross midnight
        // or requests that are entirely within the same day portion
        if (availCrossesMidnight) {
          // Request must either:
          // 1. Cross midnight and be within the range (start >= availStart OR end <= availEnd)
          // 2. Be entirely in the late night portion (start >= availStart)
          // 3. Be entirely in the early morning portion (end <= availEnd)
          const validRequest =
            (requestCrossesMidnight && requestStartTime >= availStartTime && requestEndTime <= availEndTime) ||
            (requestStartTime >= availStartTime) ||
            (requestEndTime <= availEndTime)

          if (!validRequest) {
            toast({
              title: "Invalid time range",
              description: `Please select a time within ${selectedAvailability.time}`,
              variant: "destructive",
            })
            return
          }
        } else {
          // Normal case: availability doesn't cross midnight
          if (requestStartTime < availStartTime || requestEndTime > availEndTime) {
            toast({
              title: "Invalid time range",
              description: `Please select a time within ${selectedAvailability.time}`,
              variant: "destructive",
            })
            return
          }
        }
      }
    }

    // Allow midnight-crossing times (e.g., 23:00 - 01:00)
    // Only reject if start and end times are exactly the same
    if (requestStartTime === requestEndTime) {
      toast({
        title: "Invalid time range",
        description: "Start and end times cannot be the same.",
        variant: "destructive",
      })
      return
    }

    if (!selectedFriend || !selectedAvailability) {
      toast({
        title: "Error",
        description: "Missing required information",
        variant: "destructive",
      })
      return
    }

    try {
      const dateString = selectedAvailability.date
      console.log("[v0] Original date string:", dateString)
      let isoDate: string

      // Try to parse the date string (e.g., "Friday, Oct 17")
      const dateMatch = dateString.match(/(\w+),\s*(\w+)\s+(\d+)/)
      console.log("[v0] Date match result:", dateMatch)

      if (dateMatch) {
        const [_, _weekday, month, day] = dateMatch
        console.log("[v0] Parsed date parts:", { month, day })

        const currentYear = new Date().getFullYear()
        const monthMap: { [key: string]: number } = {
          Jan: 0,
          Feb: 1,
          Mar: 2,
          Apr: 3,
          May: 4,
          Jun: 5,
          Jul: 6,
          Aug: 7,
          Sep: 8,
          Oct: 9,
          Nov: 10,
          Dec: 11,
        }
        const monthIndex = monthMap[month]
        console.log("[v0] Month index:", monthIndex)

        const parsedDate = new Date(currentYear, monthIndex, Number.parseInt(day))
        console.log("[v0] Parsed date object:", parsedDate)

        // Format date as YYYY-MM-DD in local timezone (not UTC)
        // Note: We don't need to validate if the date is in the past here because
        // the availability is already filtered in getFriendsAvailability() to exclude past events
        const year = parsedDate.getFullYear()
        const monthNum = String(parsedDate.getMonth() + 1).padStart(2, "0")
        const dayNum = String(parsedDate.getDate()).padStart(2, "0")
        isoDate = `${year}-${monthNum}-${dayNum}`
        console.log("[v0] Final ISO date:", isoDate)
      } else {
        console.log("[v0] Date match failed, trying fallback parse")
        // Fallback: try to parse as a regular date string
        const parsedDate = new Date(dateString)
        if (isNaN(parsedDate.getTime())) {
          console.error("[v0] Failed to parse date:", dateString)
          throw new Error("Invalid date format")
        }
        // Format date as YYYY-MM-DD in local timezone (not UTC)
        const year = parsedDate.getFullYear()
        const monthNum = String(parsedDate.getMonth() + 1).padStart(2, "0")
        const dayNum = String(parsedDate.getDate()).padStart(2, "0")
        isoDate = `${year}-${monthNum}-${dayNum}`
        console.log("[v0] Fallback ISO date:", isoDate)
      }

      console.log("[v0] About to create hangout request with ISO date:", isoDate)

      await createHangoutRequest({
        receiver_id: selectedAvailability.userId,
        availability_id: selectedAvailability.availabilityId,
        requested_date: isoDate,
        requested_start_time: requestStartTime,
        requested_end_time: requestEndTime,
        message: requestMessage,
      })

      const startTimeDisplay = new Date(`2000-01-01T${requestStartTime}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      const endTimeDisplay = new Date(`2000-01-01T${requestEndTime}`).toLocaleTimeString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })

      toast({
        title: "Request sent!",
        description: `Your hangout request for ${startTimeDisplay} - ${endTimeDisplay} has been sent to ${selectedFriend.name}.`,
      })

      setShowRequestModal(false)
      setRequestMessage("")
      setRequestStartTime("")
      setRequestEndTime("")

      loadData()
    } catch (error) {
      console.error("[v0] Error sending request:", error)
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send request. Please try again.",
        variant: "destructive",
      })
    }
  }

  const goToPreviousWeek = () => {
    const newDate = new Date(selectedWeekStart)
    newDate.setDate(selectedWeekStart.getDate() - 7)
    setSelectedWeekStart(newDate)
  }

  const goToNextWeek = () => {
    const newDate = new Date(selectedWeekStart)
    newDate.setDate(selectedWeekStart.getDate() + 7)
    setSelectedWeekStart(newDate)
  }

  const goToToday = () => {
    setSelectedWeekStart(new Date())
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      // Set to the start of the week (Sunday)
      const dayOfWeek = date.getDay()
      const weekStart = new Date(date)
      weekStart.setDate(date.getDate() - dayOfWeek)
      setSelectedWeekStart(weekStart)
      setShowCalendarPicker(false)
    }
  }

  const isCurrentWeek = () => {
    const today = new Date()
    const todayWeekStart = new Date(today)
    todayWeekStart.setDate(today.getDate() - today.getDay())
    return selectedWeekStart.toDateString() === todayWeekStart.toDateString()
  }

  const handleOpenMessageThread = (plan: any) => {
    const threadId = `plan_${plan.id}`
    setMessageThreadId(threadId)
    setMessageThreadRequestId(plan.id) // Set the request ID for messaging
    setMessageThreadFriend(plan.friend)
    setMessageThreadDetails({
      date:
        typeof plan.date === "string"
          ? plan.date
          : plan.date.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            }),
      time: plan.time,
      location: plan.location,
      status: plan.status,
    })
    setShowMessageThread(true)
  }

  const handleInviteFriends = async () => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : ""
    const inviteMessage = `Hey! I've been using this app to coordinate hangouts with friends and thought you'd like it too. Check it out: ${appUrl}`

    if (navigator.share && navigator.canShare) {
      try {
        await navigator.share({
          title: "Join me on Hangout!",
          text: inviteMessage,
          url: appUrl,
        })
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          handleCopyInvite(inviteMessage)
        }
      }
    } else {
      handleCopyInvite(inviteMessage)
    }
  }

  const handleCopyInvite = async (message: string) => {
    try {
      await navigator.clipboard.writeText(message)
      toast({
        title: "Copied to clipboard!",
        description: "Share the invite link with your friends",
      })
    } catch (error) {
      console.error("[v0] Error copying to clipboard:", error)
      toast({
        title: "Error",
        description: "Failed to copy invite link",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading your plans...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-3xl font-bold text-balance mb-2">Your Week</h1>
        <p className="text-muted-foreground text-pretty">See when your friends are free</p>
      </div>

      <div className="px-6 mb-4">
        <p className="text-lg font-medium text-foreground">
          You have{" "}
          <span className="font-bold" style={{ color: "#CEFEB8" }}>
            {confirmedPlans.length} {confirmedPlans.length === 1 ? "plan" : "plans"}
          </span>{" "}
          this week
        </p>
      </div>

      <div className="px-6 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {isCurrentWeek()
                ? "This Week"
                : selectedWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </h2>
            {confirmedPlans.length > 0 && (
              <Badge variant="secondary" className="bg-primary/10 text-foreground border-primary/20">
                {confirmedPlans.length} {confirmedPlans.length === 1 ? "plan" : "plans"}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPreviousWeek}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            {!isCurrentWeek() && (
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={goToToday}>
                Today
              </Button>
            )}
            <Popover open={showCalendarPicker} onOpenChange={setShowCalendarPicker}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <CalendarIcon className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <Calendar mode="single" selected={selectedWeekStart} onSelect={handleCalendarSelect} initialFocus />
              </PopoverContent>
            </Popover>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextWeek}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {weekDays.map((date, index) => {
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            const dateToCheck = new Date(date)
            dateToCheck.setHours(0, 0, 0, 0)

            // Skip past dates
            if (dateToCheck < today) {
              return null
            }

            const isToday = date.toDateString() === new Date().toDateString()
            const dayName = date.toLocaleDateString("en-US", { weekday: "short" })
            const dayNumber = date.getDate()
            const plansCount = getPlansCountForDay(date)

            return (
              <button
                key={index}
                onClick={() => handleDayClick(date)}
                className={`flex flex-col items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 sm:py-3 rounded-xl sm:rounded-2xl min-w-[48px] sm:min-w-[70px] transition-all duration-200 ${
                  isToday
                    ? "bg-primary text-white shadow-lg scale-105"
                    : plansCount > 0
                      ? "bg-primary/10 text-foreground hover:bg-primary/20 border-2 border-primary/30"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <span className="text-[10px] sm:text-xs font-medium opacity-80">{dayName}</span>
                <span className="text-lg sm:text-xl font-bold">{dayNumber}</span>
                {plansCount > 0 && (
                  <div className="flex items-center gap-0.5 sm:gap-1">
                    <div
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isToday ? "bg-energy-high" : "bg-primary"}`}
                    />
                    <span className="text-[10px] sm:text-xs font-semibold">{plansCount}</span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
        {confirmedPlans.length > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">Tap any day to see your plans</p>
        )}
      </div>

      <div className="px-6 pb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Friends' Avales</h2>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-foreground"
            onClick={() => window.dispatchEvent(new CustomEvent("switchTab", { detail: "availability" }))}
          >
            View All
          </Button>
        </div>

        <div className="space-y-3">
          {friendsAvailability.map((item) => {
            const energyConfig = getEnergyConfig(item.energy)
            const EnergyIcon = energyConfig.icon

            return (
              <Card
                key={item.id}
                className="p-3 sm:p-4 hover:shadow-lg transition-all duration-200 border-border/50 hover:border-primary/30 group"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="relative">
                    <Avatar className="w-12 h-12 sm:w-14 sm:h-14 ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all">
                      <AvatarImage src={item.friend.avatar || "/placeholder.svg"} alt={item.friend.name} />
                      <AvatarFallback className="bg-primary/10 text-foreground font-semibold text-sm sm:text-base">
                        {item.friend.initials}
                      </AvatarFallback>
                    </Avatar>
                    {item.isActiveNow && (
                      <div className="absolute -bottom-0.5 -right-0.5 sm:-bottom-1 sm:-right-1 w-3 h-3 sm:w-4 sm:h-4 bg-energy-high rounded-full border-2 border-background animate-pulse" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base text-foreground mb-1">
                          {item.friend.firstName && item.friend.lastName
                            ? `${item.friend.firstName} ${item.friend.lastName}`
                            : item.friend.name}
                        </h3>
                      </div>

                      <Badge
                        variant="secondary"
                        className="bg-energy-high/10 text-energy-high border-energy-high/20 shrink-0 text-xs"
                      >
                        Free
                      </Badge>
                    </div>

                    <div className="mb-2">
                      <Badge
                        variant="outline"
                        className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor} text-xs`}
                      >
                        <EnergyIcon className="w-3 h-3 mr-1" />
                        {energyConfig.label}
                      </Badge>
                    </div>

                    <div className="space-y-1 sm:space-y-1.5 mb-3">
                      <div className="flex items-center gap-2 text-xs sm:text-sm">
                        <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground" />
                        <span className="font-medium">{item.date}</span>
                        <span className="text-muted-foreground">• {item.time}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
                        <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span>{item.location}</span>
                      </div>
                    </div>

                    {item.tags && item.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {item.tags.map((tag: string, index: number) => (
                          <Badge
                            key={index}
                            variant="secondary"
                            className="bg-primary/10 text-foreground border-primary/20 text-xs px-2 py-0.5"
                          >
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <div className="flex gap-2">
                      {item.requestStatus === "pending" ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-muted hover:bg-muted text-muted-foreground text-xs sm:text-sm cursor-not-allowed"
                          disabled
                        >
                          Request Pending
                        </Button>
                      ) : item.requestStatus === "accepted" ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-energy-high/20 hover:bg-energy-high/30 text-energy-high border border-energy-high/30 text-xs sm:text-sm cursor-default"
                          disabled
                        >
                          ✓ Accepted
                        </Button>
                      ) : item.requestStatus === "declined" || item.requestStatus === "rejected" ? (
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm"
                          onClick={() => handleSendRequest(item.friend, item)}
                        >
                          Send Again
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          className="flex-1 bg-primary hover:bg-primary/90 text-white text-xs sm:text-sm"
                          onClick={() => handleSendRequest(item.friend, item)}
                        >
                          Send Request
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="bg-transparent text-xs sm:text-sm"
                        onClick={() => handleViewProfile(item.friend)}
                      >
                        View Profile
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {friendsAvailability.length === 0 && (
          <Card className="p-4 sm:p-8 text-center border-dashed mt-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2 text-sm sm:text-base">No friends available yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Check back later or invite friends to share their availability
            </p>
          </Card>
        )}

        <div className="mt-4">
          <Button variant="outline" size="sm" className="w-full bg-transparent" onClick={handleInviteFriends}>
            Invite Friends
          </Button>
        </div>
      </div>

      <Dialog open={showProfileModal} onOpenChange={setShowProfileModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center gap-4 pt-4">
              <Avatar className="w-24 h-24 ring-4 ring-primary/20">
                <AvatarImage src={selectedFriend?.avatar || "/placeholder.svg"} alt={selectedFriend?.name} />
                <AvatarFallback className="bg-primary/10 text-foreground font-semibold text-2xl">
                  {selectedFriend?.initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <DialogTitle className="text-2xl mb-2">{selectedFriend?.name}</DialogTitle>
                <DialogDescription className="text-base">{selectedFriend?.bio || "No bio yet"}</DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-foreground">{selectedFriend?.mutualFriends || 0}</div>
                <div className="text-xs text-muted-foreground">Mutual Friends</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-energy-high">{friendHangoutsCount}</div>
                <div className="text-xs text-muted-foreground">Hangouts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-energy-low">{friendGroupsCount}</div>
                <div className="text-xs text-muted-foreground">Groups</div>
              </div>
            </div>
            {friendRequestStatus === "pending" ? (
              <Button
                className="w-full bg-muted hover:bg-muted text-muted-foreground cursor-not-allowed"
                disabled
              >
                Request Pending
              </Button>
            ) : friendRequestStatus === "accepted" ? (
              <Button
                className="w-full bg-energy-high/20 hover:bg-energy-high/30 text-energy-high border border-energy-high/30 cursor-default"
                disabled
              >
                ✓ Accepted
              </Button>
            ) : friendRequestStatus === "declined" || friendRequestStatus === "rejected" ? (
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => {
                  setShowProfileModal(false)
                  handleSendRequest(selectedFriend)
                }}
              >
                Send Again
              </Button>
            ) : (
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => {
                  setShowProfileModal(false)
                  handleSendRequest(selectedFriend)
                }}
              >
                Send Hangout Request
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRequestModal} onOpenChange={setShowRequestModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Request to {selectedFriend?.name}</DialogTitle>
            <DialogDescription>
              {selectedAvailability
                ? `They're available ${selectedAvailability.date} • ${selectedAvailability.time}`
                : "Choose your preferred time"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
              <Label className="text-sm font-semibold">When do you want to hang out?</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="start-time" className="text-xs text-muted-foreground">
                    Start Time
                  </Label>
                  <Select value={requestStartTime} onValueChange={setRequestStartTime}>
                    <SelectTrigger id="start-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end-time" className="text-xs text-muted-foreground">
                    End Time
                  </Label>
                  <Select value={requestEndTime} onValueChange={setRequestEndTime}>
                    <SelectTrigger id="end-time">
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      {generateTimeOptions().map((time) => (
                        <SelectItem key={time.value} value={time.value}>
                          {time.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message (optional)</Label>
              <Textarea
                id="message"
                placeholder="Hey! Want to grab coffee?"
                value={requestMessage}
                onChange={(e) => setRequestMessage(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowRequestModal(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1 bg-primary hover:bg-primary/90"
                onClick={() => {
                  console.log("[v0] Send Request button clicked")
                  submitRequest()
                }}
              >
                Send Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showDayModal} onOpenChange={setShowDayModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedDay?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
            </DialogTitle>
            <DialogDescription>
              {getPlansForDay(selectedDay || selectedWeekStart).length > 0
                ? "Your plans for this day"
                : "No plans scheduled yet"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            {selectedDay && getPlansForDay(selectedDay).length > 0 ? (
              getPlansForDay(selectedDay).map((plan) => {
                const energyConfig = getEnergyConfig(plan.energy)
                const EnergyIcon = energyConfig.icon

                return (
                  <Card key={plan.id} className="p-4 border-primary/30 bg-primary/5">
                    <div className="flex items-start gap-3">
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={plan.friend.avatar || "/placeholder.svg"} alt={plan.friend.name} />
                        <AvatarFallback className="bg-primary/10 text-foreground font-semibold">
                          {plan.friend.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{plan.friend.name}</h3>
                          <Badge
                            variant="outline"
                            className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor} text-xs`}
                          >
                            <EnergyIcon className="w-3 h-3 mr-1" />
                            {energyConfig.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{plan.activity}</p>
                        <div className="space-y-1 mb-3">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span>{plan.time}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3" />
                            <span>{plan.location}</span>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full bg-transparent"
                          onClick={() => {
                            setShowDayModal(false)
                            handleOpenMessageThread(plan)
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2" />
                          Message {plan.friend.name}
                        </Button>
                      </div>
                    </div>
                  </Card>
                )
              })
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">No plans scheduled for this day</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <MessageThread
        open={showMessageThread}
        onOpenChange={setShowMessageThread}
        threadId={messageThreadId}
        requestId={messageThreadRequestId}
        friend={messageThreadFriend || { name: "", initials: "" }}
        hangoutDetails={messageThreadDetails}
      />
    </div>
  )
}
