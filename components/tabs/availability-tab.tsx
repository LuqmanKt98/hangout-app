"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import {
  Clock,
  Users,
  Plus,
  Share2,
  Flame,
  Moon,
  Monitor,
  User,
  Trash2,
  CalendarIcon,
  X,
  Link2,
  Copy,
  Edit,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  createAvailability,
  updateAvailability,
  deleteAvailability,
  getMyAvailability,
  createSharedAvailability,
  getAvailabilitySharedFriends,
  getAvailabilitySharedGroups,
  type Availability,
  type EnergyLevel as ApiEnergyLevel,
} from "@/lib/api/availability"
import { setAvailableNow, type Profile } from "@/lib/api/profile"
import { createClient } from "@/lib/supabase/client"
import { CreateBookableLinkModal } from "@/components/create-bookable-link-modal"
import { getMyBookableAvailability, deleteBookableAvailability, updateBookableAvailability, type BookableAvailability } from "@/lib/api/bookable-availability"
import { getFriends } from "@/lib/api/friends"
import { getMyGroups, type GroupWithMembers } from "@/lib/api/groups"
import { getCurrentTimeRounded, getTwoHoursLater, generateTimeOptions, formatTime12Hour } from "@/lib/utils/timezone"

// Define ShareMode and Friend types
type ShareMode = "friends" | "groups"
interface Friend {
  id: string
  name: string
  avatar: string | null
  initials: string
  status: "available" | "busy" | "offline" // Example statuses
}

const timeOptions = generateTimeOptions()

export function AvailabilityTab() {
  const [isLoading, setIsLoading] = useState(true)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingSlot, setEditingSlot] = useState<Availability | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [quickPreset, setQuickPreset] = useState("")
  // const [selectedEnergy, setSelectedEnergy] = useState<EnergyLevel>("low") // Replaced by ApiEnergyLevel
  const [shareMode, setShareMode] = useState<ShareMode>("friends")
  const [selectedFriends, setSelectedFriends] = useState<string[]>([])
  const [selectedGroups, setSelectedGroups] = useState<string[]>([])
  const [availableNowEnergy, setAvailableNowEnergy] = useState<ApiEnergyLevel>("low")
  const [showAvailableNowModal, setShowAvailableNowModal] = useState(false)
  const [showDeleteBookableDialog, setShowDeleteBookableDialog] = useState(false)
  const [bookableToDelete, setBookableToDelete] = useState<string | null>(null)
  const [showEditBookableModal, setShowEditBookableModal] = useState(false)
  const [editingBookable, setEditingBookable] = useState<BookableAvailability | null>(null)
  const [availabilitySlots, setAvailabilitySlots] = useState<Availability[]>([])
  const [sharedFriendsMap, setSharedFriendsMap] = useState<
    Record<string, Array<{ id: string; name: string; avatar: string | null }>>
  >({})
  const [sharedGroupsMap, setSharedGroupsMap] = useState<
    Record<string, Array<{ id: string; name: string }>>
  >({})
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [slotToDelete, setSlotToDelete] = useState<string | null>(null)
  const [showAvailableNowVisibilityModal, setShowAvailableNowVisibilityModal] = useState(false)
  const [availableNowShareMode, setAvailableNowShareMode] = useState<ShareMode>("friends")
  // Initialize availableNowVisibleTo as an empty array
  const [availableNowVisibleTo, setAvailableNowVisibleTo] = useState<string[]>([])
  const [availableNowVisibleGroup, setAvailableNowVisibleGroup] = useState<string>("Close Friends")
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [editDate, setEditDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [editStartTime, setEditStartTime] = useState("")
  const [editEndTime, setEditEndTime] = useState("")
  const [selectedEnergy, setSelectedEnergy] = useState<ApiEnergyLevel>("low")
  const [editEnergy, setEditEnergy] = useState<ApiEnergyLevel>("low")
  const { toast } = useToast()

  const [isAvailableNow, setIsAvailableNow] = useState(false)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [supabase, setSupabase] = useState<any>(null)

  const [showCreateBookableModal, setShowCreateBookableModal] = useState(false)
  const [bookableLinks, setBookableLinks] = useState<BookableAvailability[]>([])

  const [friends, setFriends] = useState<Friend[]>([])
  const [isLoadingFriends, setIsLoadingFriends] = useState(true)

  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [isLoadingGroups, setIsLoadingGroups] = useState(true)

  const [showDatePicker, setShowDatePicker] = useState(false)
  const [showEditDatePicker, setShowEditDatePicker] = useState(false)

  const [availableNowStartTime, setAvailableNowStartTime] = useState("")
  const [availableNowEndTime, setAvailableNowEndTime] = useState("")

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (supabase) {
      loadAvailability()
      loadProfile()
      loadBookableLinks()
      loadFriends()
      loadGroups()
    }
  }, [supabase])

  const loadFriends = async () => {
    try {
      setIsLoadingFriends(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setFriends([])
        return
      }
      
      const friendsData = await getFriends()
      const formattedFriends: Friend[] = friendsData
        .filter((friendship: any) => friendship.friend && friendship.friend.id !== user.id)
        .map((friendship: any) => {
          const profile = friendship.friend
          return {
            id: profile.id,
            name: profile.display_name || profile.email,
            avatar: profile.avatar_url,
            initials: getInitials(profile.display_name || profile.email),
            status: "available",
          }
        })
      setFriends(formattedFriends)
    } catch (error) {
      console.error("[v0] Error loading friends:", error)
      setFriends([])
    } finally {
      setIsLoadingFriends(false)
    }
  }

  const loadGroups = async () => {
    try {
      setIsLoadingGroups(true)
      const groupsData = await getMyGroups()
      setGroups(groupsData)
    } catch (error) {
      console.error("[v0] Error loading groups:", error)
      setGroups([])
    } finally {
      setIsLoadingGroups(false)
    }
  }

  const getInitials = (name: string): string => {
    const parts = name.split(" ")
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.substring(0, 2).toUpperCase()
  }

  const loadAvailability = async () => {
    try {
      console.log("[v0] Loading availability...")
      setIsLoading(true)
      const data = await getMyAvailability()
      console.log("[v0] Availability loaded:", data.length, "slots")
      
      // Filter out expired availability (past date/time)
      const now = new Date()
      const filteredData = data.filter(slot => {
        // Handle times that cross midnight (end_time < start_time)
        let slotDateTime = new Date(`${slot.date}T${slot.end_time}`)
        const startDateTime = new Date(`${slot.date}T${slot.start_time}`)

        // If end time is before start time, it means the event crosses midnight
        if (slotDateTime < startDateTime) {
          // Add one day to the end time
          slotDateTime = new Date(slotDateTime.getTime() + 24 * 60 * 60 * 1000)
        }

        const isValid = slotDateTime >= now
        console.log("[v0] Filtering slot:", { date: slot.date, endTime: slot.end_time, slotDateTime, now, isValid })
        return isValid
      })
      console.log("[v0] Filtered availability:", filteredData.length, "slots")

      setAvailabilitySlots(filteredData)

      const friendsMap: Record<string, Array<{ id: string; name: string; avatar: string | null }>> = {}
      const groupsMap: Record<string, Array<{ id: string; name: string }>> = {}
      for (const slot of filteredData) {
        const sharedFriends = await getAvailabilitySharedFriends(slot.id)
        const sharedGroups = await getAvailabilitySharedGroups(slot.id)
        friendsMap[slot.id] = sharedFriends
        groupsMap[slot.id] = sharedGroups
      }
      setSharedFriendsMap(friendsMap)
      setSharedGroupsMap(groupsMap)
    } catch (error) {
      console.error("[v0] Error loading availability:", error)
      toast({
        title: "Failed to load availability",
        description: "Please try refreshing the page.",
        variant: "destructive",
      })
      setAvailabilitySlots([])
    } finally {
      console.log("[v0] Setting isLoading to false")
      setIsLoading(false)
    }
  }

  const loadProfile = async () => {
    if (!supabase) return
    try {
      console.log("[v0] Loading profile...")
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (profileData) {
          console.log("[v0] Profile loaded")
          
          // Check if Available Now has expired
          if (profileData.available_now && profileData.available_now_until) {
            const untilDate = new Date(profileData.available_now_until)
            const now = new Date()
            if (now >= untilDate) {
              console.log("[v0] Available Now has expired, turning off")
              await setAvailableNow(false)
              profileData.available_now = false
              profileData.available_now_energy = null
              profileData.available_now_until = null
            }
          }
          
          setProfile(profileData)
          setIsAvailableNow(profileData.available_now || false)
          if (profileData.available_now_energy) {
            setAvailableNowEnergy(profileData.available_now_energy as ApiEnergyLevel)
          }

          // Load Available Now visibility if it's enabled
          if (profileData.available_now) {
            await loadAvailableNowVisibility(user.id)
          } else {
            // Reset visibility if Available Now is disabled
            setAvailableNowVisibleTo([])
          }
        }
      }
    } catch (error) {
      console.error("[v0] Error loading profile:", error)
    }
  }

  const loadAvailableNowVisibility = async (userId: string) => {
    try {
      console.log("[v0] Loading Available Now visibility...")
      if (!supabase) return

      // Get the current "Available Now" availability record (today's record)
      const today = new Date().toISOString().split("T")[0]
      const { data: availabilityRecords } = await supabase
        .from("availability")
        .select("id")
        .eq("user_id", userId)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(1)

      if (availabilityRecords && availabilityRecords.length > 0) {
        const availabilityId = availabilityRecords[0].id
        console.log("[v0] Found Available Now record:", availabilityId)

        // Get shared friends for this availability
        const sharedFriends = await getAvailabilitySharedFriends(availabilityId)
        const friendIds = sharedFriends.map((f) => f.id)
        console.log("[v0] Loaded shared friends:", friendIds)
        setAvailableNowVisibleTo(friendIds)
      } else {
        console.log("[v0] No Available Now record found for today")
        setAvailableNowVisibleTo([])
      }
    } catch (error) {
      console.error("[v0] Error loading Available Now visibility:", error)
      setAvailableNowVisibleTo([])
    }
  }

  const loadBookableLinks = async () => {
    try {
      const data = await getMyBookableAvailability()
      setBookableLinks(data)
    } catch (error) {
      console.error("[v0] Error loading bookable links:", error)
    }
  }

  const [activityTags, setActivityTags] = useState<string[]>([])
  const [editActivityTags, setEditActivityTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState("")
  const [editTagInput, setEditTagInput] = useState("")

  const suggestedActivities = [
    "coffee",
    "walk",
    "dinner",
    "drinks",
    "lunch",
    "workout",
    "study",
    "movie",
    "gaming",
    "shopping",
    "park",
    "beach",
    "hike",
    "brunch",
    "picnic",
  ]

  // const groups = [
  //   { id: "close", name: "Close Friends", members: 8 },
  //   { id: "work", name: "Work Crew", members: 12 },
  //   { id: "weekend", name: "Weekend Warriors", members: 6 },
  // ]

  const quickPresets = [
    { label: "Tonight", icon: "🌙", value: "tonight" },
    { label: "This Weekend", icon: "🎉", value: "weekend" },
    { label: "Next Week", icon: "📅", value: "nextweek" },
    { label: "Flexible", icon: "✨", value: "flexible" },
  ]

  const energyLevels = [
    {
      value: "high" as ApiEnergyLevel,
      label: "High Energy",
      icon: Flame,
      description: "Ready for adventure",
      examples: "dinner, drinks, dancing, hiking",
      color: "text-energy-high",
      bgColor: "bg-energy-high/10",
      borderColor: "border-energy-high/30",
    },
    {
      value: "low" as ApiEnergyLevel,
      label: "Low Energy",
      icon: Moon,
      description: "Chill vibes only",
      examples: "coffee, walks, couch hangs",
      color: "text-energy-low",
      bgColor: "bg-energy-low/10",
      borderColor: "border-energy-low/30",
    },
    {
      value: "virtual" as ApiEnergyLevel,
      label: "Virtual",
      icon: Monitor,
      description: "Remote hangouts",
      examples: "video calls, gaming, watch parties",
      color: "text-foreground",
      bgColor: "bg-primary/10",
      borderColor: "border-primary/30",
    },
  ]

  const getEnergyConfig = (energy: ApiEnergyLevel) => {
    return energyLevels.find((e) => e.value === energy) || energyLevels[1]
  }

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) => (prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]))
  }

  const toggleGroup = (groupId: string) => {
    setSelectedGroups((prev) => (prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]))
  }

  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    if (time) {
      const [hours, minutes] = time.split(":").map(Number)
      const endHours = (hours + 1) % 24
      const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      setEndTime(endTime)
    }
  }

  const handleEditStartTimeChange = (time: string) => {
    setEditStartTime(time)
    if (time) {
      const [hours, minutes] = time.split(":").map(Number)
      const endHours = (hours + 1) % 24
      const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      setEditEndTime(endTime)
    }
  }

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !activityTags.includes(trimmedTag) && activityTags.length < 5) {
      setActivityTags([...activityTags, trimmedTag])
      setTagInput("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    setActivityTags(activityTags.filter((tag) => tag !== tagToRemove))
  }

  const addEditTag = (tag: string) => {
    const trimmedTag = tag.trim().toLowerCase()
    if (trimmedTag && !editActivityTags.includes(trimmedTag) && editActivityTags.length < 5) {
      setEditActivityTags([...editActivityTags, trimmedTag])
      setEditTagInput("")
    }
  }

  const removeEditTag = (tagToRemove: string) => {
    setEditActivityTags(editActivityTags.filter((tag) => tag !== tagToRemove))
  }

  const handleShare = async (slot: Availability) => {
    try {
      const shareData = await createSharedAvailability(slot.id)
      const energyConfig = getEnergyConfig(slot.energy_level)
      const shareUrl = `${window.location.origin}/share/${shareData.id}`

      const startTime12 = formatTime12Hour(slot.start_time)
      const endTime12 = formatTime12Hour(slot.end_time)
      const shareText = `I'm free ${new Date(slot.date).toLocaleDateString()} from ${startTime12} - ${endTime12} for ${energyConfig.label.toLowerCase()} hangouts! Check it out: ${shareUrl}`

      await navigator.clipboard.writeText(shareText)
      toast({
        title: "Copied to clipboard!",
        description: "Share this link with your friends.",
      })
    } catch (error: any) {
      toast({
        title: "Failed to share",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (slot: Availability) => {
    setEditingSlot(slot)
    setEditDate(new Date(slot.date))
    setEditStartTime(slot.start_time)
    setEditEndTime(slot.end_time)
    setEditEnergy(slot.energy_level)
    setEditActivityTags(slot.activity_tags || [])
    setShowEditModal(true)
  }

  const saveEdit = async () => {
    if (!editingSlot || !editDate) return

    try {
      // Format date as YYYY-MM-DD in local timezone (not UTC)
      const year = editDate.getFullYear()
      const month = String(editDate.getMonth() + 1).padStart(2, "0")
      const day = String(editDate.getDate()).padStart(2, "0")
      const localDateString = `${year}-${month}-${day}`

      await updateAvailability(editingSlot.id, {
        date: localDateString,
        start_time: editStartTime,
        end_time: editEndTime,
        energy_level: editEnergy,
        activity_tags: editActivityTags,
      })

      // Delete existing shares for this availability
      const supabase = createClient()
      await supabase.from("availability_shares").delete().eq("availability_id", editingSlot.id)

      // Add new shares based on share mode
      if (shareMode === "friends" && selectedFriends.length > 0) {
        const { shareAvailabilityWithFriends } = await import("@/lib/api/availability")
        await shareAvailabilityWithFriends(editingSlot.id, selectedFriends)
      } else if (shareMode === "groups" && selectedGroups.length > 0) {
        const { shareAvailabilityWithGroups } = await import("@/lib/api/availability")
        await shareAvailabilityWithGroups(editingSlot.id, selectedGroups)
      }

      toast({
        title: "Availability updated!",
        description: "Your availability has been successfully updated.",
      })

      setShowEditModal(false)
      setEditActivityTags([])
      setSelectedFriends([])
      setSelectedGroups([])
      loadAvailability()
    } catch (error: any) {
      toast({
        title: "Failed to update",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const saveQuickAdd = async () => {
    const missingFields: string[] = []
    if (!selectedDate) missingFields.push("Date")
    if (!startTime) missingFields.push("Start Time")
    if (!endTime) missingFields.push("End Time")

    if (missingFields.length > 0) {
      toast({
        title: "Missing information",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      })
      return
    }

    try {
      // Format date as YYYY-MM-DD in local timezone (not UTC)
      const year = selectedDate.getFullYear()
      const month = String(selectedDate.getMonth() + 1).padStart(2, "0")
      const day = String(selectedDate.getDate()).padStart(2, "0")
      const localDateString = `${year}-${month}-${day}`

      const availability = await createAvailability({
        date: localDateString,
        start_time: startTime,
        end_time: endTime,
        energy_level: selectedEnergy,
        tags: activityTags,
        visible_to: "friends",
        location: null,
      })

      // Share with both friends and groups if selected
      if (selectedFriends.length > 0) {
        console.log("[v0] Sharing availability with friends:", selectedFriends)
        const { shareAvailabilityWithFriends } = await import("@/lib/api/availability")
        const shareResult = await shareAvailabilityWithFriends(availability.id, selectedFriends)
        console.log("[v0] Share result:", shareResult)
      }

      if (selectedGroups.length > 0) {
        console.log("[v0] Sharing availability with groups:", selectedGroups)
        const { shareAvailabilityWithGroups } = await import("@/lib/api/availability")
        const shareResult = await shareAvailabilityWithGroups(availability.id, selectedGroups)
        console.log("[v0] Share result:", shareResult)
      }

      const totalShareCount = selectedFriends.length + selectedGroups.length
      const shareDescriptions = []
      if (selectedFriends.length > 0) {
        shareDescriptions.push(`${selectedFriends.length} friend${selectedFriends.length > 1 ? "s" : ""}`)
      }
      if (selectedGroups.length > 0) {
        shareDescriptions.push(`${selectedGroups.length} group${selectedGroups.length > 1 ? "s" : ""}`)
      }
      const shareDescription = shareDescriptions.join(" and ")

      toast({
        title: "Availability added!",
        description: `Your ${selectedDate.toLocaleDateString()} availability has been added${totalShareCount > 0 ? ` and shared with ${shareDescription}` : ""}.`,
      })

      setShowAddModal(false)
      setSelectedDate(undefined)
      setStartTime("")
      setEndTime("")
      setActivityTags([])
      setSelectedFriends([])
      setSelectedGroups([])
      loadAvailability()

      window.dispatchEvent(new Event("availabilityUpdated"))
    } catch (error: any) {
      console.error("[v0] Error adding availability:", error)
      toast({
        title: "Failed to add availability",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDelete = (id: string) => {
    setSlotToDelete(id)
    setShowDeleteDialog(true)
  }

  const confirmDelete = async () => {
    if (!slotToDelete) return

    try {
      await deleteAvailability(slotToDelete)
      toast({
        title: "Availability deleted",
        description: "Your availability has been removed.",
      })
      setShowDeleteDialog(false)
      setSlotToDelete(null)
      loadAvailability()
    } catch (error: any) {
      toast({
        title: "Failed to delete",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const getVisibleToText = () => {
    if (availableNowShareMode === "friends") {
      if (availableNowVisibleTo.length === 0) return "No one"
      const names = availableNowVisibleTo
        .map((id) => friends.find((f) => f.id === id)?.name.split(" ")[0])
        .filter(Boolean)
      if (names.length <= 3) return names.join(", ")
      return `${names.slice(0, 2).join(", ")} +${names.length - 2} more`
    } else {
      return availableNowVisibleGroup
    }
  }

  const saveAvailableNowVisibility = async () => {
    try {
      if (!supabase || !profile) return

      // Get the current "Available Now" availability record (today's record)
      const today = new Date().toISOString().split("T")[0]
      const { data: availabilityRecords } = await supabase
        .from("availability")
        .select("id")
        .eq("user_id", profile.id)
        .eq("date", today)
        .order("created_at", { ascending: false })
        .limit(1)

      if (availabilityRecords && availabilityRecords.length > 0) {
        const availabilityId = availabilityRecords[0].id

        // Delete existing shares for this availability
        await supabase.from("availability_shares").delete().eq("availability_id", availabilityId)

        // Add new shares if friends are selected
        if (availableNowVisibleTo.length > 0) {
          const { shareAvailabilityWithFriends } = await import("@/lib/api/availability")
          await shareAvailabilityWithFriends(availabilityId, availableNowVisibleTo)
        }
      }

      setShowAvailableNowVisibilityModal(false)
      toast({
        title: "Visibility updated!",
        description: `Your Available Now status is now visible to ${getVisibleToText()}.`,
      })
    } catch (error: any) {
      console.error("[v0] Error saving visibility:", error)
      toast({
        title: "Failed to update visibility",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  useEffect(() => {
    if (showAvailableNowModal && !availableNowStartTime) {
      const currentTime = getCurrentTimeRounded()
      setAvailableNowStartTime(currentTime)
      setAvailableNowEndTime(getTwoHoursLater(currentTime))
    }
  }, [showAvailableNowModal])

  // Listen for availability updates
  useEffect(() => {
    const handleAvailabilityUpdated = () => {
      console.log("[v0] Availability updated event received, reloading...")
      // Add a small delay to ensure database has been updated
      setTimeout(() => {
        loadAvailability()
      }, 500)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("availabilityUpdated", handleAvailabilityUpdated)
      return () => {
        window.removeEventListener("availabilityUpdated", handleAvailabilityUpdated)
      }
    }
  }, [])

  const handleAvailableNowToggle = async (checked: boolean) => {
    console.log("[v0] handleAvailableNowToggle:", checked)

    if (checked) {
      // If no friends are selected and share mode is "friends", default to all friends
      if (availableNowVisibleTo.length === 0 && availableNowShareMode === "friends") {
        console.log("[v0] No friends selected, defaulting to all friends")
        // Set all friends as visible
        const allFriendIds = friends.map((f) => f.id)
        setAvailableNowVisibleTo(allFriendIds)
      }
      setShowAvailableNowModal(true)
      return
    }

    try {
      await setAvailableNow(
        checked,
        availableNowEnergy,
        undefined, // No duration needed when turning off
        undefined, // No friends needed when turning off
      )
      setIsAvailableNow(checked)
      toast({
        title: "Available Now turned off",
        description: "Your Available Now status has been turned off",
      })
      loadProfile()

      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("availabilityUpdated"))
      }
    } catch (error: any) {
      console.error("[v0] Error in handleAvailableNowToggle:", error)
      toast({
        title: "Failed to update status",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAvailableNowStartTimeChange = (time: string) => {
    setAvailableNowStartTime(time)
    if (time) {
      setAvailableNowEndTime(getTwoHoursLater(time))
    }
  }

  const copyBookableLink = async (token: string, title: string) => {
    const shareUrl = `${window.location.origin}/book/${token}`

    try {
      await navigator.clipboard.writeText(shareUrl)
      // Only show success message after successful copy
      toast({
        title: "Link copied!",
        description: "Share this link with your friends.",
      })
    } catch (error: any) {
      console.error('[v0] Copy error:', error)
      toast({
        title: "Failed to copy link",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const ShareSelection = () => (
    <div className="space-y-4">
      <Label>Share with</Label>
      <Tabs value={shareMode} onValueChange={(v) => setShareMode(v as ShareMode)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="friends" className="gap-2">
            <User className="w-4 h-4" />
            Specific Friends
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-2">
            <Users className="w-4 h-4" />
            Groups
          </TabsTrigger>
        </TabsList>

        <TabsContent value="friends" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">Select one or more friends to share with</p>
          {/* Add loading state for friends */}
          {isLoadingFriends ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading friends...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No friends yet. Add friends to share with them!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`friend-${friend.id}`}
                    checked={selectedFriends.includes(friend.id)}
                    onCheckedChange={() => toggleFriend(friend.id)}
                  />
                  <Label htmlFor={`friend-${friend.id}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                    <div className="relative">
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                        <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                          {friend.initials}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                          friend.status === "available"
                            ? "bg-energy-high"
                            : friend.status === "busy"
                              ? "bg-energy-low"
                              : "bg-muted"
                        }`}
                      />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{friend.name}</div>
                      <div className="text-xs text-muted-foreground capitalize">{friend.status}</div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          )}
          {selectedFriends.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">
                Selected {selectedFriends.length} {selectedFriends.length === 1 ? "friend" : "friends"}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedFriends.map((id) => {
                  const friend = friends.find((f) => f.id === id)
                  return friend ? (
                    <Badge key={id} variant="secondary" className="bg-primary/10 text-foreground border-primary/20">
                      {friend.name.split(" ")[0]}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="groups" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">Select one or more groups to share with</p>
          {isLoadingGroups ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">No groups yet. Create groups to share with them!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <Checkbox
                    id={`group-${group.id}`}
                    checked={selectedGroups.includes(group.id)}
                    onCheckedChange={() => toggleGroup(group.id)}
                  />
                  <Label htmlFor={`group-${group.id}`} className="flex items-center gap-3 flex-1 cursor-pointer">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-5 h-5 text-foreground" />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{group.name}</div>
                      <div className="text-xs text-muted-foreground">{group.member_count} members</div>
                    </div>
                  </Label>
                </div>
              ))}
            </div>
          )}
          {selectedGroups.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-sm font-medium mb-2">
                Selected {selectedGroups.length} {selectedGroups.length === 1 ? "group" : "groups"}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedGroups.map((id) => {
                  const group = groups.find((g) => g.id === id)
                  return group ? (
                    <Badge key={id} variant="secondary" className="bg-primary/10 text-foreground border-primary/20">
                      {group.name}
                    </Badge>
                  ) : null
                })}
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading availability...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up">
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-4 sm:pb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-balance mb-2">My Availability</h1>
        <p className="text-sm sm:text-base text-muted-foreground text-pretty">Let friends know when you're free</p>
      </div>

      <div className="px-4 sm:px-6 mb-3 sm:mb-4">
        <Card
          className="p-3 sm:p-4 bg-gradient-to-br from-primary/5 to-accent/5 border-primary/20 cursor-pointer hover:shadow-lg transition-all"
          onClick={() => setShowAvailableNowModal(true)}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm sm:text-base mb-0.5">Available Now</h3>
              <p className="text-xs text-muted-foreground mb-1.5">Let friends know you're free to hang</p>
              <Badge
                variant="outline"
                className={`text-xs ${getEnergyConfig(availableNowEnergy).bgColor} ${getEnergyConfig(availableNowEnergy).color} ${getEnergyConfig(availableNowEnergy).borderColor}`}
              >
                {(() => {
                  const EnergyIcon = getEnergyConfig(availableNowEnergy).icon
                  return <EnergyIcon className="w-3 h-3 mr-1" />
                })()}
                {getEnergyConfig(availableNowEnergy).label}
              </Badge>
            </div>
            <Switch
              checked={isAvailableNow}
              onCheckedChange={handleAvailableNowToggle}
              onClick={(e) => e.stopPropagation()}
              className="data-[state=checked]:bg-primary"
            />
          </div>
          <div
            className="mb-2 p-2 rounded-lg bg-background/50 border border-border/50 cursor-pointer hover:bg-background/80 transition-colors"
            onClick={(e) => {
              e.stopPropagation()
              setShowAvailableNowVisibilityModal(true)
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 flex-1">
                {availableNowShareMode === "friends" ? (
                  <User className="w-3.5 h-3.5 text-muted-foreground" />
                ) : (
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <div>
                  <p className="text-xs text-muted-foreground">Visible to</p>
                  <p className="text-xs font-medium">{getVisibleToText()}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-foreground">
                Edit
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs bg-transparent"
            onClick={(e) => {
              e.stopPropagation()
              setShowAvailableNowModal(true)
            }}
          >
            <Clock className="w-3.5 h-3.5 mr-1.5" />
            Set Duration & Vibe
          </Button>
        </Card>
      </div>

      <div className="px-4 sm:px-6 pb-6">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold">My Avales</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCreateBookableModal(true)}
            className="bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/30"
          >
            <Link2 className="w-4 h-4 mr-2" />
            Create Bookable Link
          </Button>
        </div>

        {bookableLinks.length > 0 && (
          <div className="mb-4 space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">Bookable Links</h3>
            {bookableLinks.map((link) => {
              const energyConfig = getEnergyConfig(link.energy_level)
              const EnergyIcon = energyConfig.icon
              const isExpired = new Date(link.expires_at) < new Date()

              return (
                <Card key={link.id} className={`p-3 border-border/50 ${isExpired ? "opacity-50" : ""}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{link.title}</h4>
                        {isExpired && (
                          <Badge variant="outline" className="text-xs">
                            Expired
                          </Badge>
                        )}
                        {!link.is_active && (
                          <Badge variant="outline" className="text-xs">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor} text-xs`}
                        >
                          <EnergyIcon className="w-3 h-3 mr-1" />
                          {link.activity_type}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {link.time_slots.length} time slot{link.time_slots.length !== 1 ? "s" : ""} available
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyBookableLink(link.share_token, link.title)}
                        className="h-8 w-8 p-0"
                        disabled={isExpired || !link.is_active}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingBookable(link)
                          setShowEditBookableModal(true)
                        }}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setBookableToDelete(link.id)
                          setShowDeleteBookableDialog(true)
                        }}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        )}

        {availabilitySlots.length === 0 ? (
          <Card className="p-6 sm:p-12 text-center border-dashed">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Clock className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-2">No availability set</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Let your friends know when you're free to hang out
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-sm" onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Availability
            </Button>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {availabilitySlots.map((slot) => {
              const energyConfig = getEnergyConfig(slot.energy_level)
              const EnergyIcon = energyConfig.icon
              const sharedFriends = sharedFriendsMap[slot.id] || []
              const sharedGroups = sharedGroupsMap[slot.id] || []

              // Build shared with text combining friends and groups
              const sharedWithParts: string[] = []
              if (sharedFriends.length > 0) {
                sharedWithParts.push(sharedFriends.map((f) => f.name.split(" ")[0]).join(", "))
              }
              if (sharedGroups.length > 0) {
                sharedWithParts.push(sharedGroups.map((g) => g.name).join(", "))
              }
              const sharedWithText = sharedWithParts.join(" • ")

              return (
                <Card
                  key={slot.id}
                  className="p-3 sm:p-4 border-border/50 cursor-pointer hover:bg-muted/30 transition-colors"
                  onClick={() => handleEdit(slot)}
                >
                  <div className="flex items-start justify-between mb-2 sm:mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm sm:text-base">
                          {new Date(slot.date).toLocaleDateString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                          })}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge
                          variant="outline"
                          className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor}`}
                        >
                          <EnergyIcon className="w-3 h-3 mr-1" />
                          {energyConfig.label}
                        </Badge>
                      </div>
                      {slot.activity_tags && slot.activity_tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {slot.activity_tags.map((tag) => (
                            <Badge
                              key={tag}
                              variant="secondary"
                              className="bg-primary/10 text-foreground border-primary/20 text-xs"
                            >
                              #{tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground mb-2">
                        <Clock className="w-4 h-4" />
                        <span>
                          {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                        </span>
                      </div>
                      {(sharedFriends.length > 0 || sharedGroups.length > 0) && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                          <Users className="w-4 h-4" />
                          <span>Shared with: {sharedWithText}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <Switch defaultChecked={true} className="data-[state=checked]:bg-energy-high" />
                    </div>
                  </div>
                  <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 bg-transparent hover:bg-primary/10 hover:text-primary hover:border-primary/30"
                      onClick={() => handleShare(slot)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share via Text
                    </Button>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 pb-6">
        <Card className="p-3 sm:p-4 bg-muted/50 border-border/50">
          <p className="text-xs sm:text-sm text-muted-foreground text-center">
            Only friends and groups you select can see your availability
          </p>
        </Card>
      </div>

      <button
        onClick={() => setShowAddModal(true)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110 flex items-center justify-center z-40 active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Availability</DialogTitle>
            <DialogDescription>Update your availability details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={showEditDatePicker} onOpenChange={setShowEditDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editDate
                      ? editDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                      : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editDate}
                    onSelect={(date) => {
                      setEditDate(date)
                      setShowEditDatePicker(false) // Auto-close on select
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
              <div className="space-y-2">
                <Label htmlFor="editStartTime">Start Time</Label>
                <Select value={editStartTime} onValueChange={handleEditStartTimeChange}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="editEndTime">End Time</Label>
                <Select value={editEndTime} onValueChange={setEditEndTime}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Energy Level</Label>
              <RadioGroup
                value={editEnergy}
                onValueChange={(v) => setEditEnergy(v as ApiEnergyLevel)}
                className="space-y-3"
              >
                {energyLevels.map((energy) => {
                  const Icon = energy.icon
                  return (
                    <div key={energy.value} className="flex items-start space-x-3">
                      <RadioGroupItem value={energy.value} id={`edit-${energy.value}`} className="mt-1" />
                      <Label htmlFor={`edit-${energy.value}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${energy.color}`} />
                          <span className="font-semibold">{energy.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{energy.description}</p>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Activity Ideas (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={editTagInput}
                  onChange={(e) => setEditTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addEditTag(editTagInput)
                    }
                  }}
                  placeholder="Type activity and press Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addEditTag(editTagInput)}
                  disabled={editActivityTags.length >= 5}
                >
                  Add
                </Button>
              </div>
              {editActivityTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {editActivityTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-primary/10 text-foreground border-primary/20 pr-1"
                    >
                      #{tag}
                      <button
                        onClick={() => removeEditTag(tag)}
                        className="ml-1 hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <p className="text-xs text-muted-foreground w-full mb-1">Suggestions:</p>
                {suggestedActivities
                  .filter((activity) => !editActivityTags.includes(activity))
                  .slice(0, 8)
                  .map((activity) => (
                    <Button
                      key={activity}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-transparent"
                      onClick={() => addEditTag(activity)}
                      disabled={editActivityTags.length >= 5}
                    >
                      #{activity}
                    </Button>
                  ))}
              </div>
            </div>

            <ShareSelection />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30 bg-transparent"
                onClick={() => {
                  if (editingSlot) {
                    setShowEditModal(false)
                    handleDelete(editingSlot.id)
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </Button>
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowEditModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={saveEdit}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Availability</DialogTitle>
            <DialogDescription>Set when you're free to hang out</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Popover open={showDatePicker} onOpenChange={setShowDatePicker}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal bg-transparent">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate
                      ? selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
                      : "Select a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => {
                      setSelectedDate(date)
                      setShowDatePicker(false) // Auto-close on select
                    }}
                    initialFocus
                    disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
              <div className="space-y-2">
                <Label htmlFor="startTime">Start Time</Label>
                <Select value={startTime} onValueChange={handleStartTimeChange}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <Select value={endTime} onValueChange={setEndTime}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <Label>Energy Level</Label>
              <RadioGroup
                value={selectedEnergy}
                onValueChange={(value) => setSelectedEnergy(value as ApiEnergyLevel)}
                className="space-y-3"
              >
                {energyLevels.map((energy) => {
                  const Icon = energy.icon
                  return (
                    <div key={energy.value} className="flex items-start space-x-3">
                      <RadioGroupItem value={energy.value} id={energy.value} className="mt-1" />
                      <Label htmlFor={energy.value} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${energy.color}`} />
                          <span className="font-semibold">{energy.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{energy.description}</p>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Activity Ideas (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  placeholder="Type activity and press Enter"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addTag(tagInput)}
                  disabled={activityTags.length >= 5}
                >
                  Add
                </Button>
              </div>
              {activityTags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {activityTags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="bg-primary/10 text-foreground border-primary/20 pr-1"
                    >
                      #{tag}
                      <button onClick={() => removeTag(tag)} className="ml-1 hover:bg-primary/20 rounded-full p-0.5">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-1.5 mt-2">
                <p className="text-xs text-muted-foreground w-full mb-1">Suggestions:</p>
                {suggestedActivities
                  .filter((activity) => !activityTags.includes(activity))
                  .slice(0, 8)
                  .map((activity) => (
                    <Button
                      key={activity}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs bg-transparent"
                      onClick={() => addTag(activity)}
                      disabled={activityTags.length >= 5}
                    >
                      #{activity}
                    </Button>
                  ))}
              </div>
            </div>

            <ShareSelection />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={saveQuickAdd}>
                Add Availability
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete availability?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this availability slot? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showAvailableNowVisibilityModal} onOpenChange={setShowAvailableNowVisibilityModal}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Who can see you're available?</DialogTitle>
            <DialogDescription>Choose which friends or groups can see your Available Now status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Tabs
              value={availableNowShareMode}
              onValueChange={(v) => setAvailableNowShareMode(v as ShareMode)}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="friends" className="gap-2">
                  <User className="w-4 h-4" />
                  Specific Friends
                </TabsTrigger>
                <TabsTrigger value="groups" className="gap-2">
                  <Users className="w-4 h-4" />
                  Groups
                </TabsTrigger>
              </TabsList>

              <TabsContent value="friends" className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">Select friends who can see you're available now</p>
                {/* Add loading state for friends */}
                {isLoadingFriends ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Loading friends...</p>
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No friends yet. Add friends to share with them!</p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[240px] overflow-y-auto">
                    {friends.map((friend) => (
                      <div
                        key={friend.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`available-now-friend-${friend.id}`}
                          checked={availableNowVisibleTo.includes(friend.id)}
                          onCheckedChange={() => {
                            setAvailableNowVisibleTo((prev) =>
                              prev.includes(friend.id) ? prev.filter((id) => id !== friend.id) : [...prev, friend.id],
                            )
                          }}
                        />
                        <Label
                          htmlFor={`available-now-friend-${friend.id}`}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <div className="relative">
                            <Avatar className="w-10 h-10">
                              <AvatarImage src={friend.avatar || "/placeholder.svg"} alt={friend.name} />
                              <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-sm">
                                {friend.initials}
                              </AvatarFallback>
                            </Avatar>
                            <div
                              className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                                friend.status === "available"
                                  ? "bg-energy-high"
                                  : friend.status === "busy"
                                    ? "bg-energy-low"
                                    : "bg-muted"
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{friend.name}</div>
                            <div className="text-xs text-muted-foreground capitalize">{friend.status}</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </div>
                )}
                {availableNowVisibleTo.length > 0 && (
                  <div className="pt-2 border-t">
                    <p className="text-sm font-medium mb-2">
                      Selected {availableNowVisibleTo.length}{" "}
                      {availableNowVisibleTo.length === 1 ? "friend" : "friends"}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {availableNowVisibleTo.map((id) => {
                        const friend = friends.find((f) => f.id === id)
                        return friend ? (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="bg-primary/10 text-foreground border-primary/20"
                          >
                            {friend.name.split(" ")[0]}
                          </Badge>
                        ) : null
                      })}
                    </div>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="groups" className="space-y-3 mt-4">
                <p className="text-sm text-muted-foreground">Choose a group who can see you're available now</p>
                {isLoadingGroups ? (
                  <div className="text-center py-8">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-sm text-muted-foreground mt-2">Loading groups...</p>
                  </div>
                ) : groups.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No groups yet. Create groups to share with them!</p>
                  </div>
                ) : (
                  <RadioGroup
                    value={availableNowVisibleGroup}
                    onValueChange={setAvailableNowVisibleGroup}
                    className="space-y-2"
                  >
                    {groups.map((group) => (
                      <div
                        key={group.id}
                        className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <RadioGroupItem value={group.name} id={`available-now-group-${group.id}`} />
                        <Label
                          htmlFor={`available-now-group-${group.id}`}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Users className="w-5 h-5 text-foreground" />
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{group.name}</div>
                            <div className="text-xs text-muted-foreground">{group.member_count} members</div>
                          </div>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setShowAvailableNowVisibilityModal(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={saveAvailableNowVisibility}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAvailableNowModal} onOpenChange={setShowAvailableNowModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Configure Available Now</DialogTitle>
            <DialogDescription>Set when you're free and your vibe</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label htmlFor="availableNowStartTime">Start Time</Label>
                <Select value={availableNowStartTime} onValueChange={handleAvailableNowStartTimeChange}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue placeholder="Select start time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="availableNowEndTime">End Time</Label>
                <Select value={availableNowEndTime} onValueChange={setAvailableNowEndTime}>
                  <SelectTrigger className="bg-transparent">
                    <SelectValue placeholder="Select end time" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[200px]">
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {formatTime12Hour(time)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <Label>What vibe are you going for?</Label>
              <RadioGroup
                value={availableNowEnergy}
                onValueChange={(value) => setAvailableNowEnergy(value as ApiEnergyLevel)}
                className="space-y-3"
              >
                {energyLevels.map((energy) => {
                  const Icon = energy.icon
                  return (
                    <div key={energy.value} className="flex items-start space-x-3">
                      <RadioGroupItem id={`now-${energy.value}`} value={energy.value} className="mt-1" />
                      <Label htmlFor={`now-${energy.value}`} className="flex-1 cursor-pointer">
                        <div className="flex items-center gap-2 mb-1">
                          <Icon className={`w-4 h-4 ${energy.color}`} />
                          <span className="font-semibold">{energy.label}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{energy.description}</p>
                        <p className="text-xs text-muted-foreground mt-1">{energy.examples}</p>
                      </Label>
                    </div>
                  )
                })}
              </RadioGroup>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90"
              onClick={async () => {
                if (!availableNowStartTime || !availableNowEndTime) {
                  toast({
                    title: "Missing information",
                    description: "Please select start and end times",
                    variant: "destructive",
                  })
                  return
                }

                try {
                  // Parse times from 12-hour format (e.g., "6:30 pm") to 24-hour format
                  const parseTime12Hour = (timeStr: string): number => {
                    // Match both uppercase and lowercase AM/PM
                    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i)
                    if (!match) {
                      console.error("[v0] Failed to parse time:", timeStr)
                      return 0
                    }
                    let hours = parseInt(match[1])
                    const minutes = parseInt(match[2])
                    const period = match[3].toUpperCase()

                    if (period === "PM" && hours !== 12) hours += 12
                    if (period === "AM" && hours === 12) hours = 0

                    return hours * 60 + minutes
                  }

                  // Convert 12-hour time to 24-hour HH:mm format
                  const convertTo24Hour = (timeStr: string): string => {
                    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm|AM|PM)/i)
                    if (!match) {
                      console.error("[v0] Failed to parse time:", timeStr)
                      return "00:00"
                    }
                    let hours = parseInt(match[1])
                    const minutes = parseInt(match[2])
                    const period = match[3].toUpperCase()

                    if (period === "PM" && hours !== 12) hours += 12
                    if (period === "AM" && hours === 12) hours = 0

                    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
                  }

                  const startTotalMinutes = parseTime12Hour(availableNowStartTime)
                  const endTotalMinutes = parseTime12Hour(availableNowEndTime)
                  const durationMinutes =
                    endTotalMinutes >= startTotalMinutes
                      ? endTotalMinutes - startTotalMinutes
                      : 24 * 60 - startTotalMinutes + endTotalMinutes

                  const startTime24 = convertTo24Hour(availableNowStartTime)
                  const endTime24 = convertTo24Hour(availableNowEndTime)

                  console.log("[v0] Available Now times:", { availableNowStartTime, availableNowEndTime, startTime24, endTime24, startTotalMinutes, endTotalMinutes, durationMinutes })

                  await setAvailableNow(true, availableNowEnergy, durationMinutes, availableNowVisibleTo, startTime24, endTime24)
                  setIsAvailableNow(true)
                  setShowAvailableNowModal(false)
                  toast({
                    title: "You're now available!",
                    description: `${getVisibleToText()} can see you're available for ${getEnergyConfig(availableNowEnergy).label.toLowerCase()} hangouts`,
                  })
                  loadProfile()

                  if (typeof window !== "undefined") {
                    window.dispatchEvent(new Event("availabilityUpdated"))
                  }
                } catch (error: any) {
                  toast({
                    title: "Failed to update status",
                    description: error.message || "Please try again.",
                    variant: "destructive",
                  })
                }
              }}
            >
              Turn On Available Now
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateBookableLinkModal
        open={showCreateBookableModal}
        onOpenChange={setShowCreateBookableModal}
        onSuccess={loadBookableLinks}
      />

      <AlertDialog open={showDeleteBookableDialog} onOpenChange={setShowDeleteBookableDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete bookable link?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this bookable link? This action cannot be undone and the link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!bookableToDelete) return
                try {
                  await deleteBookableAvailability(bookableToDelete)
                  toast({
                    title: "Bookable link deleted",
                    description: "Your bookable link has been removed.",
                  })
                  setShowDeleteBookableDialog(false)
                  setBookableToDelete(null)
                  loadBookableLinks()
                } catch (error: any) {
                  toast({
                    title: "Failed to delete",
                    description: error.message || "Please try again.",
                    variant: "destructive",
                  })
                }
              }}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showEditBookableModal} onOpenChange={setShowEditBookableModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Bookable Link</DialogTitle>
            <DialogDescription>Update your bookable link status</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {editingBookable && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Title</Label>
                  <p className="text-sm font-medium">{editingBookable.title}</p>
                </div>
                {editingBookable.description && (
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Description</Label>
                    <p className="text-sm text-muted-foreground">{editingBookable.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Activity</Label>
                    <p className="text-sm">{editingBookable.activity_type}</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold">Energy Level</Label>
                    <p className="text-sm capitalize">{editingBookable.energy_level}</p>
                  </div>
                </div>
              </>
            )}
            <div className="space-y-2 pt-2 border-t">
              <Label>Link Status</Label>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Active</p>
                  <p className="text-xs text-muted-foreground">Link is currently {editingBookable?.is_active ? 'active' : 'inactive'}</p>
                </div>
                <Switch
                  checked={editingBookable?.is_active || false}
                  onCheckedChange={async (checked) => {
                    if (!editingBookable) return
                    try {
                      await updateBookableAvailability(editingBookable.id, { is_active: checked })
                      setEditingBookable({ ...editingBookable, is_active: checked })
                      toast({
                        title: checked ? "Link activated" : "Link deactivated",
                        description: checked ? "Your bookable link is now active." : "Your bookable link has been deactivated.",
                      })
                      loadBookableLinks()
                    } catch (error: any) {
                      toast({
                        title: "Failed to update",
                        description: error.message || "Please try again.",
                        variant: "destructive",
                      })
                    }
                  }}
                />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1 bg-transparent"
                onClick={() => setShowEditBookableModal(false)}
              >
                Close
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  if (editingBookable) {
                    setBookableToDelete(editingBookable.id)
                    setShowDeleteBookableDialog(true)
                    setShowEditBookableModal(false)
                  }
                }}
              >
                Delete
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
