"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Users, UserPlus, Bell, Shield, HelpCircle, LogOut, ChevronRight, Search } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"
import {
  getFriends,
  getPendingFriendRequests,
  searchUsersByEmail,
  sendFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  type Profile,
} from "@/lib/api/friends"
import { getMyGroups, type GroupWithMembers } from "@/lib/api/groups"
import { GroupsModal } from "@/components/groups-modal"
import { EditProfileModal } from "@/components/edit-profile-modal"
import { FriendProfileModal } from "@/components/friend-profile-modal"
import { PrivacySettingsModal } from "@/components/privacy-settings-modal"
import { SettingsModal } from "@/components/settings-modal"
import { HelpSupportModal } from "@/components/help-support-modal"

export function ProfileTab() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [friends, setFriends] = useState<any[]>([])
  const [pendingRequests, setPendingRequests] = useState<any[]>([])
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [showPendingRequestsModal, setShowPendingRequestsModal] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [groups, setGroups] = useState<GroupWithMembers[]>([])
  const [showGroupsModal, setShowGroupsModal] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupWithMembers | null>(null)
  const [showEditProfileModal, setShowEditProfileModal] = useState(false)
  const [selectedFriend, setSelectedFriend] = useState<{ profile: Profile; friendshipId: string } | null>(null)
  const [showFriendProfileModal, setShowFriendProfileModal] = useState(false)
  const [hangoutsCount, setHangoutsCount] = useState(0)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showHelpModal, setShowHelpModal] = useState(false)
  const { toast } = useToast()
  const router = useRouter()
  const [supabase, setSupabase] = useState<any>(null)

  useEffect(() => {
    setSupabase(createClient())
  }, [])

  useEffect(() => {
    if (supabase) {
      loadUserData()
      loadFriends()
      loadPendingRequests()
      loadGroups()
      loadHangoutsCount()
    }
  }, [supabase])

  const loadUserData = async () => {
    if (!supabase) return
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", user.id).single()
        if (profileData) setProfile(profileData)
      }
    } catch (error) {
      console.error("Error loading user:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadFriends = async () => {
    try {
      const friendsData = await getFriends()
      setFriends(friendsData)
    } catch (error: any) {
      console.error("Error loading friends:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })
    }
  }

  const loadPendingRequests = async () => {
    try {
      const requests = await getPendingFriendRequests()
      setPendingRequests(requests)
    } catch (error: any) {
      console.error("Error loading pending requests:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })
    }
  }

  const loadGroups = async () => {
    try {
      const groupsData = await getMyGroups()
      setGroups(groupsData)
    } catch (error: any) {
      console.error("Error fetching user memberships:", {
        message: error?.message,
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        stack: error?.stack
      })
    }
  }

  const loadHangoutsCount = async () => {
    if (!supabase) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from("hangout_requests")
        .select("id", { count: "exact" })
        .eq("status", "accepted")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)

      if (!error && data) {
        setHangoutsCount(data.length)
      }
    } catch (error) {
      console.error("Error loading hangouts count:", error)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    console.log("[v0] Starting search with query:", searchQuery)
    setIsSearching(true)
    try {
      const results = await searchUsersByEmail(searchQuery)
      console.log("[v0] Search completed, results:", results)
      setSearchResults(results)

      if (results.length === 0) {
        toast({
          title: "No users found",
          description: "Try searching by email, name, phone, or location",
        })
      } else {
        toast({
          title: "Search complete",
          description: `Found ${results.length} user${results.length !== 1 ? "s" : ""}`,
        })
      }
    } catch (error: any) {
      console.error("[v0] Error searching users:", error)
      toast({
        title: "Search failed",
        description: error.message || "Could not search for users. Please try again.",
        variant: "destructive",
      })
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleSendRequest = async (friendId: string) => {
    console.log("[v0] Attempting to send friend request to:", friendId)
    try {
      await sendFriendRequest(friendId)
      toast({
        title: "Friend request sent!",
        description: "Your friend request has been sent.",
      })
      setSearchResults([])
      setSearchQuery("")
      loadPendingRequests()
    } catch (error: any) {
      console.error("[v0] Error sending friend request:", error)
      toast({
        title: "Failed to send request",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId)
      toast({
        title: "Friend request accepted!",
        description: "You are now friends.",
      })
      loadFriends()
      loadPendingRequests()
    } catch (error: any) {
      toast({
        title: "Failed to accept request",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleDeclineRequest = async (friendshipId: string) => {
    try {
      await declineFriendRequest(friendshipId)
      toast({
        title: "Friend request declined",
      })
      loadPendingRequests()
    } catch (error: any) {
      toast({
        title: "Failed to decline request",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
    router.push("/auth/login")
    router.refresh()
  }

  const handleCreateGroup = () => {
    setEditingGroup(null)
    setShowGroupsModal(true)
  }

  const handleEditGroup = (group: GroupWithMembers) => {
    setEditingGroup(group)
    setShowGroupsModal(true)
  }

  const handleFriendClick = (friendship: any) => {
    setSelectedFriend({ profile: friendship.friend, friendshipId: friendship.id })
    setShowFriendProfileModal(true)
  }

  const handleUnfriend = async (friendshipId: string) => {
    try {
      // Get the friendship record to find the friend_id
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Not authenticated")

      // First, get the friendship record to find the friend_id
      const { data: friendship, error: fetchError } = await supabase
        .from("friendships")
        .select("user_id, friend_id")
        .eq("id", friendshipId)
        .single()

      if (fetchError || !friendship) {
        throw new Error("Friendship not found")
      }

      // Determine the friend's ID
      const friendId = friendship.user_id === user.id ? friendship.friend_id : friendship.user_id

      // Delete both directions of the friendship
      const { error } = await supabase
        .from("friendships")
        .delete()
        .or(
          `and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`
        )

      if (error) throw error

      toast({
        title: "Friend removed",
        description: "You are no longer friends.",
      })
      loadFriends()
    } catch (error: any) {
      toast({
        title: "Failed to remove friend",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    }
  }

  const menuItems = [
    {
      icon: Bell,
      label: "Friend Requests", // Renamed from "Notifications" to "Friend Requests" since it only shows friend requests
      badge: pendingRequests.length > 0 ? pendingRequests.length.toString() : null,
      onClick: () => setShowPendingRequestsModal(true),
    },
    { icon: Shield, label: "Privacy", badge: null, onClick: () => setShowPrivacyModal(true) },
    { icon: Settings, label: "Settings", badge: null, onClick: () => setShowSettingsModal(true) },
    { icon: HelpCircle, label: "Help & Support", badge: null, onClick: () => setShowHelpModal(true) },
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-slide-up pb-6">
      <div className="px-4 sm:px-6 pt-6 sm:pt-8 pb-6 sm:pb-8">
        <div className="flex items-start gap-3 sm:gap-5 mb-6 sm:mb-8">
          <div className="relative">
            <Avatar className="w-20 h-20 sm:w-24 sm:h-24 ring-4 ring-primary/10 shadow-lg">
              <AvatarImage src={profile?.avatar_url || "/placeholder-user.jpg"} alt="Your profile" />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-2xl font-bold">
                {profile?.display_name?.substring(0, 2).toUpperCase() || "YO"}
              </AvatarFallback>
            </Avatar>
            <div className="absolute bottom-0 right-0 w-6 h-6 sm:w-7 sm:h-7 bg-energy-high rounded-full border-4 border-background shadow-sm" />
          </div>

          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold mb-1.5">{profile?.display_name || "Your Name"}</h1>
            <p className="text-muted-foreground mb-1 text-sm sm:text-base">{user?.email || "@username"}</p>
            {profile?.location && (
              <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3">📍 {profile.location}</p>
            )}
            <Button
              variant="outline"
              size="sm"
              className="bg-transparent font-medium text-sm"
              onClick={() => setShowEditProfileModal(true)}
            >
              Edit Profile
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-5 text-center border-border/50 hover:border-primary/40 hover:shadow-md transition-all duration-200">
            <div className="text-2xl sm:text-3xl font-bold text-primary mb-1 sm:mb-2">{friends.length}</div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Friends</div>
          </Card>
          <Card className="p-3 sm:p-5 text-center border-border/50 hover:border-energy-low/40 hover:shadow-md transition-all duration-200">
            <div className="text-2xl sm:text-3xl font-bold text-energy-low mb-1 sm:mb-2">{hangoutsCount}</div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Hangouts</div>
          </Card>
          <Card className="p-3 sm:p-5 text-center border-border/50 hover:border-energy-high/40 hover:shadow-md transition-all duration-200">
            <div className="text-2xl sm:text-3xl font-bold text-energy-high mb-1 sm:mb-2">{groups.length}</div>
            <div className="text-xs sm:text-sm text-muted-foreground font-medium">Groups</div>
          </Card>
        </div>
      </div>

      <div className="px-4 sm:px-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-xl sm:text-2xl font-bold">Friends</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary font-medium"
            onClick={() => setShowAddFriendModal(true)}
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Add
          </Button>
        </div>

        {friends.length === 0 ? (
          <Card className="p-6 sm:p-12 text-center border-dashed">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-2">No friends yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Add friends to start planning hangouts together
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-sm" onClick={() => setShowAddFriendModal(true)}>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Your First Friend
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-4 gap-4">
            {friends.slice(0, 8).map((friendship) => {
              const friend = friendship.friend
              return (
                <button
                  key={friendship.id}
                  className="flex flex-col items-center gap-2.5 group"
                  onClick={() => handleFriendClick(friendship)}
                >
                  <div className="relative">
                    <Avatar className="w-16 h-16 ring-2 ring-border group-hover:ring-primary group-hover:scale-105 transition-all duration-200 shadow-sm">
                      <AvatarImage src={friend.avatar_url || "/placeholder.svg"} alt={friend.display_name} />
                      <AvatarFallback className="bg-muted text-muted-foreground font-semibold text-base">
                        {friend?.display_name?.substring(0, 2).toUpperCase() || "??"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-background shadow-sm bg-muted" />
                  </div>
                  <span className="text-xs text-center text-muted-foreground group-hover:text-foreground transition-colors line-clamp-1 w-full font-medium">
                    {friend.display_name.split(" ")[0]}
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 mb-6 sm:mb-8">
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <h2 className="text-xl sm:text-2xl font-bold">Groups</h2>
          <Button variant="ghost" size="sm" className="text-primary font-medium" onClick={handleCreateGroup}>
            <UserPlus className="w-4 h-4 mr-1.5" />
            Create
          </Button>
        </div>

        {groups.length === 0 ? (
          <Card className="p-6 sm:p-12 text-center border-dashed">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-muted mx-auto mb-3 sm:mb-4 flex items-center justify-center">
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-base sm:text-lg mb-2">No groups yet</h3>
            <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
              Create groups to organize your friends
            </p>
            <Button className="bg-primary hover:bg-primary/90 text-sm" onClick={handleCreateGroup}>
              <UserPlus className="w-4 h-4 mr-2" />
              Create Your First Group
            </Button>
          </Card>
        ) : (
          <div className="space-y-2 sm:space-y-3">
            {groups.map((group) => (
              <button
                key={group.id}
                onClick={() => handleEditGroup(group)}
                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-secondary hover:bg-secondary/80 hover:shadow-md transition-all duration-200 text-left"
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center shadow-sm"
                  style={{ backgroundColor: group.color }}
                >
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-base mb-0.5">{group.name}</h3>
                  <p className="text-sm text-muted-foreground">{group.member_count} members</p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-4 sm:px-6 mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-5">Settings</h2>
        <Card className="divide-y divide-border/50 overflow-hidden shadow-sm">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.label}
                onClick={item.onClick}
                className="w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-muted/50 transition-colors duration-200 text-left"
              >
                <Icon className="w-5 h-5 text-muted-foreground" />
                <span className="flex-1 font-medium text-sm sm:text-base">{item.label}</span>
                {item.badge && (
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 font-semibold">
                    {item.badge}
                  </Badge>
                )}
                <ChevronRight className="w-5 h-5 text-muted-foreground" />
              </button>
            )
          })}
        </Card>
      </div>

      <div className="px-4 sm:px-6">
        <Button
          variant="outline"
          className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent font-medium"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Log Out
        </Button>
      </div>

      <Dialog open={showAddFriendModal} onOpenChange={setShowAddFriendModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Add Friend</DialogTitle>
            <DialogDescription className="text-base">Search for friends by name or email</DialogDescription>
          </DialogHeader>
          <div className="space-y-5 pt-4">
            <div className="space-y-2.5">
              <Label htmlFor="searchQuery" className="text-base font-medium">
                Search
              </Label>
              <div className="flex gap-2">
                <Input
                  id="searchQuery"
                  type="text"
                  placeholder="Search by email, name, phone, or location"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch()
                    }
                  }}
                  className="h-11"
                />
                <Button onClick={handleSearch} disabled={isSearching} className="min-w-[44px]">
                  {isSearching ? (
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Search by email address, phone number, name, or location</p>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {searchResults.map((result) => (
                  <div key={result.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={result.avatar_url || "/placeholder.svg"} />
                      <AvatarFallback>{result?.display_name?.substring(0, 2).toUpperCase() || "??"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{result.display_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{result.email}</p>
                    </div>
                    <Button size="sm" onClick={() => handleSendRequest(result.id)}>
                      Add
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <Button
              variant="outline"
              className="w-full bg-transparent font-medium"
              onClick={() => {
                setShowAddFriendModal(false)
                setSearchQuery("")
                setSearchResults([])
              }}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showPendingRequestsModal} onOpenChange={setShowPendingRequestsModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Friend Requests</DialogTitle>
            <DialogDescription className="text-base">
              {pendingRequests.length} pending request{pendingRequests.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-4 max-h-96 overflow-y-auto">
            {pendingRequests.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No pending requests</p>
            ) : (
              pendingRequests.map((request) => {
                const requester = request.requester || {}
                const displayName = requester.display_name || "Unknown User"
                const avatarUrl = requester.avatar_url || "/placeholder.svg"
                const initials = displayName.substring(0, 2).toUpperCase()

                return (
                  <div key={request.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={avatarUrl || "/placeholder.svg"} />
                      <AvatarFallback>{initials}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{displayName}</p>
                      {requester.email && <p className="text-xs text-muted-foreground truncate">{requester.email}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleDeclineRequest(request.id)}>
                        Decline
                      </Button>
                      <Button size="sm" onClick={() => handleAcceptRequest(request.id)}>
                        Accept
                      </Button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      <GroupsModal
        open={showGroupsModal}
        onOpenChange={setShowGroupsModal}
        onGroupsChanged={loadGroups}
        editingGroup={editingGroup}
      />

      <EditProfileModal
        open={showEditProfileModal}
        onOpenChange={setShowEditProfileModal}
        profile={profile}
        onProfileUpdated={loadUserData}
      />

      <FriendProfileModal
        open={showFriendProfileModal}
        onOpenChange={setShowFriendProfileModal}
        friend={selectedFriend?.profile || null}
        friendshipId={selectedFriend?.friendshipId || null}
        onUnfriend={handleUnfriend}
      />

      <PrivacySettingsModal open={showPrivacyModal} onOpenChange={setShowPrivacyModal} />

      <SettingsModal open={showSettingsModal} onOpenChange={setShowSettingsModal} />

      <HelpSupportModal open={showHelpModal} onOpenChange={setShowHelpModal} />
    </div>
  )
}
