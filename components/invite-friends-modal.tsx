"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MessageSquare, Copy, Check } from "lucide-react"
import { toast } from "@/components/ui/use-toast"

interface InviteFriendsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function InviteFriendsModal({ open, onOpenChange }: InviteFriendsModalProps) {
  const [phoneNumber, setPhoneNumber] = useState("")
  const [copied, setCopied] = useState(false)

  // Generate the invite message
  const appUrl = typeof window !== "undefined" ? window.location.origin : ""
  const inviteMessage = `Hey! I've been using this app to coordinate hangouts with friends and thought you'd like it too. Check it out: ${appUrl}`

  const handleSendText = () => {
    if (!phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please enter a phone number to send the invite",
        variant: "destructive",
      })
      return
    }

    // Clean the phone number (remove spaces, dashes, etc.)
    const cleanNumber = phoneNumber.replace(/\D/g, "")

    // Create SMS link with pre-filled message
    const smsLink = `sms:${cleanNumber}${/iPhone|iPad|iPod/.test(navigator.userAgent) ? "&" : "?"}body=${encodeURIComponent(inviteMessage)}`

    // Open the SMS app
    window.location.href = smsLink

    toast({
      title: "Opening messaging app",
      description: "Your messaging app should open with the invite message",
    })

    // Reset and close after a delay
    setTimeout(() => {
      setPhoneNumber("")
      onOpenChange(false)
    }, 1000)
  }

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(inviteMessage)
      setCopied(true)
      toast({
        title: "Copied!",
        description: "Invite message copied to clipboard",
      })
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      toast({
        title: "Failed to copy",
        description: "Please try again",
        variant: "destructive",
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends</DialogTitle>
          <DialogDescription>Send a text message to invite your friends to join the app</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {/* Phone Number Input */}
          <div className="space-y-2">
            <Label htmlFor="phone">Friend's Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="(555) 123-4567"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="text-base"
              autoFocus={false}
            />
            <p className="text-xs text-muted-foreground">We'll open your messaging app with a pre-filled invite</p>
          </div>

          {/* Preview Message */}
          <div className="space-y-2">
            <Label>Message Preview</Label>
            <div className="relative">
              <Textarea value={inviteMessage} readOnly rows={4} className="pr-10 text-sm resize-none" />
              <Button
                size="icon"
                variant="ghost"
                className="absolute top-2 right-2 h-8 w-8"
                onClick={handleCopyMessage}
              >
                {copied ? <Check className="w-4 h-4 text-energy-high" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleSendText}>
              <MessageSquare className="w-4 h-4 mr-2" />
              Send Text
            </Button>
          </div>

          {/* Alternative Option */}
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground text-center mb-2">Or share the invite link directly</p>
            <Button variant="outline" className="w-full bg-transparent text-sm" onClick={handleCopyMessage}>
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-2 text-energy-high" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Invite Link
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
