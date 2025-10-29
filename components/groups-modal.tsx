"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Trash2, AlertCircle } from "lucide-react"
import {
  createGroup,
  updateGroup,
  deleteGroup,
  addGroupMember,
  removeGroupMember,
  getGroupMembers,
  updateGroupMemberRole,
  type GroupWithMembers,
} from "@/lib/api/groups"
import { getFriends } from "@/lib/api/friends"
import { createClient as createBrowserClient } from "@/lib/supabase/client"
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

type GroupsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onGroupsChanged: () => void
  editingGroup?: GroupWithMembers | null
}

const colorOptions = [
  { value: "#6366f1", label: "Indigo" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
  { value: "#f59e0b", label: "Amber" },
  { value: "#10b981", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#ef4444", label: "Red" },
]

export function GroupsModal({ open, onOpenChange, onGroupsChanged, editingGroup }: GroupsModalProps) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [color, setColor] = useState("#6366f1")
  const [selectedMembers, setSelectedMembers] = useState<string[]>([])
  const [memberRoles, setMemberRoles] = useState<Record<string, 'owner' | 'admin' | 'member'>>({})
  const [friends, setFriends] = useState<any[]>([])
  const [currentMembers, setCurrentMembers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    if (open) {
      loadFriends()
      if (editingGroup) {
        setName(editingGroup.name)
        setDescription(editingGroup.description || "")
        setColor(editingGroup.color)
        loadGroupMembers()
      } else {
        resetForm()
      }
    }
  }, [open, editingGroup])

  const loadFriends = async () => {
    try {
      const friendsData = await getFriends()
      setFriends(friendsData)
    } catch (error) {
      console.error("Error loading friends:", error)
    }
  }

  const loadGroupMembers = async () => {
    if (!editingGroup) return
    try {
      const members = await getGroupMembers(editingGroup.id)
      setCurrentMembers(members)
      setSelectedMembers(members.map((m: any) => m.user_id))
      const roles: Record<string, 'owner' | 'admin' | 'member'> = {}
      members.forEach((m: any) => {
        roles[m.user_id] = m.role || 'member'
      })
      setMemberRoles(roles)
    } catch (error) {
      console.error("Error loading group members:", error)
    }
  }

  const resetForm = () => {
    setName("")
    setDescription("")
    setColor("#6366f1")
    setSelectedMembers([])
    setMemberRoles({})
    setCurrentMembers([])
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter a group name.",
        variant: "destructive",
      })
      return
    }

    // Check permissions for editing existing groups
    if (editingGroup) {
      const supabase = createBrowserClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        // Check if user is the owner or an admin
        const currentUserMember = currentMembers.find(m => m.user_id === user.id)
        const isOwner = editingGroup.created_by === user.id
        const isAdmin = currentUserMember?.role === 'admin'

        if (!isOwner && !isAdmin) {
          toast({
            title: "Permission denied",
            description: "Only the group owner or admins can add or remove members.",
            variant: "destructive",
          })
          return
        }
      }
    }

    setIsLoading(true)
    try {
      if (editingGroup) {
        // Update existing group
        await updateGroup(editingGroup.id, { name, description, color })

        // Update members
        const currentMemberIds = currentMembers.map((m) => m.user_id)
        const toAdd = selectedMembers.filter((id) => !currentMemberIds.includes(id))
        const toRemove = currentMemberIds.filter((id) => !selectedMembers.includes(id))

        for (const userId of toAdd) {
          const role = memberRoles[userId] || 'member'
          await addGroupMember(editingGroup.id, userId, role)
        }

        for (const userId of toRemove) {
          await removeGroupMember(editingGroup.id, userId)
        }

        // Update roles for existing members
        for (const userId of selectedMembers) {
          if (currentMemberIds.includes(userId)) {
            const currentMember = currentMembers.find(m => m.user_id === userId)
            const newRole = memberRoles[userId] || 'member'
            if (currentMember && currentMember.role !== newRole) {
              await updateGroupMemberRole(editingGroup.id, userId, newRole)
            }
          }
        }

        toast({
          title: "Group updated!",
          description: "Your group has been successfully updated.",
        })
      } else {
        // Create new group
        const group = await createGroup(name, description, color)

        // Add selected members
        for (const userId of selectedMembers) {
          const role = memberRoles[userId] || 'member'
          await addGroupMember(group.id, userId, role)
        }

        toast({
          title: "Group created!",
          description: "Your new group has been created.",
        })
      }

      onGroupsChanged()
      onOpenChange(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Failed to save group",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!editingGroup) return

    setIsLoading(true)
    try {
      await deleteGroup(editingGroup.id)
      toast({
        title: "Group deleted",
        description: "The group has been removed.",
      })
      onGroupsChanged()
      onOpenChange(false)
      setShowDeleteDialog(false)
      resetForm()
    } catch (error: any) {
      toast({
        title: "Failed to delete group",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMember = (userId: string) => {
    setSelectedMembers((prev) => {
      if (prev.includes(userId)) {
        // Remove member and their role
        const newRoles = { ...memberRoles }
        delete newRoles[userId]
        setMemberRoles(newRoles)
        return prev.filter((id) => id !== userId)
      } else {
        // Add member with default role
        setMemberRoles({ ...memberRoles, [userId]: 'member' })
        return [...prev, userId]
      }
    })
  }

  const updateMemberRole = (userId: string, role: 'owner' | 'admin' | 'member') => {
    setMemberRoles({ ...memberRoles, [userId]: role })
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingGroup ? "Edit Group" : "Create Group"}</DialogTitle>
            <DialogDescription>
              {editingGroup ? "Update your group details and members" : "Create a new group to organize your friends"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="groupName">Group Name</Label>
              <Input
                id="groupName"
                placeholder="e.g., Close Friends, Work Crew"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="groupDescription">Description (optional)</Label>
              <Textarea
                id="groupDescription"
                placeholder="What's this group for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Color</Label>
              <div className="flex gap-2">
                {colorOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setColor(option.value)}
                    className={`w-10 h-10 rounded-full transition-all ${
                      color === option.value ? "ring-2 ring-offset-2 ring-primary scale-110" : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: option.value }}
                    title={option.label}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Members</Label>
              <p className="text-sm text-muted-foreground">Select friends to add to this group</p>
              <div className="space-y-2 max-h-[240px] overflow-y-auto border rounded-lg p-2">
                {friends.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No friends to add</p>
                ) : (
                  friends.map((friendship) => {
                    const friend = friendship.friend
                    return (
                      <div
                        key={friendship.id}
                        className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Checkbox
                          id={`member-${friend.id}`}
                          checked={selectedMembers.includes(friend.id)}
                          onCheckedChange={() => toggleMember(friend.id)}
                        />
                        <Label
                          htmlFor={`member-${friend.id}`}
                          className="flex items-center gap-3 flex-1 cursor-pointer"
                        >
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={friend.avatar_url || "/placeholder.svg"} alt={friend.display_name} />
                            <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                              {friend?.display_name?.substring(0, 2).toUpperCase() || "??"}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <span className="font-medium text-sm">{friend.display_name}</span>
                          </div>
                        </Label>
                        {selectedMembers.includes(friend.id) && (
                          <select
                            value={memberRoles[friend.id] || 'member'}
                            onChange={(e) => updateMemberRole(friend.id, e.target.value as 'owner' | 'admin' | 'member')}
                            className="text-xs border rounded px-2 py-1 bg-background"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                            <option value="owner">Owner</option>
                          </select>
                        )}
                      </div>
                    )
                  })
                )}
              </div>
              {selectedMembers.length > 0 && (
                <div className="pt-2 border-t">
                  <p className="text-sm font-medium mb-2 mt-2">
                    {selectedMembers.length} {selectedMembers.length === 1 ? "member" : "members"} selected
                  </p>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>• Owner: Full control over group</p>
                    <p>• Admin: Can manage members</p>
                    <p>• Member: Regular member</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {editingGroup && (
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive hover:bg-destructive/10 bg-transparent"
                  onClick={() => setShowDeleteDialog(true)}
                  disabled={isLoading}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
              )}
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSave} disabled={isLoading}>
                {isLoading ? "Saving..." : editingGroup ? "Save Changes" : "Create Group"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this group? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
