"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { MapPin, Mail, Phone, UserMinus } from "lucide-react"
import { Profile } from "@/lib/api/friends"
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
import { useState } from "react"

interface FriendProfileModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  friend: Profile | null
  friendshipId: string | null
  onUnfriend: (friendshipId: string) => Promise<void>
}

export function FriendProfileModal({
  open,
  onOpenChange,
  friend,
  friendshipId,
  onUnfriend,
}: FriendProfileModalProps) {
  const [showUnfriendDialog, setShowUnfriendDialog] = useState(false)
  const [isUnfriending, setIsUnfriending] = useState(false)

  if (!friend) return null

  const handleUnfriend = async () => {
    if (!friendshipId) return
    setIsUnfriending(true)
    try {
      await onUnfriend(friendshipId)
      setShowUnfriendDialog(false)
      onOpenChange(false)
    } finally {
      setIsUnfriending(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Friend Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="flex flex-col items-center text-center">
              <Avatar className="w-24 h-24 mb-4">
                <AvatarImage src={friend.avatar_url || "/placeholder.svg"} alt={friend.display_name} />
                <AvatarFallback className="text-2xl">
                  {friend.display_name?.substring(0, 2).toUpperCase() || "??"}
                </AvatarFallback>
              </Avatar>
              <h3 className="text-2xl font-bold mb-1">{friend.display_name}</h3>
              {friend.bio && <p className="text-sm text-muted-foreground mb-3">{friend.bio}</p>}
              <Badge variant="secondary" className="mb-4">
                Friend
              </Badge>
            </div>

            <div className="space-y-3">
              {friend.email && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{friend.email}</span>
                </div>
              )}
              {friend.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <Phone className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{friend.phone}</span>
                </div>
              )}
              {friend.location && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                  <MapPin className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm">{friend.location}</span>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => setShowUnfriendDialog(true)}
                disabled={!friendshipId}
              >
                <UserMinus className="w-4 h-4 mr-2" />
                Unfriend
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showUnfriendDialog} onOpenChange={setShowUnfriendDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfriend {friend.display_name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {friend.display_name} from your friends? You'll need to send a new friend
              request to connect again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnfriending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnfriend} disabled={isUnfriending} className="bg-destructive hover:bg-destructive/90">
              {isUnfriending ? "Removing..." : "Unfriend"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
