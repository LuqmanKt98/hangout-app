"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Shield, Eye, Users, Bell, Lock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface PrivacySettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface PrivacySettings {
  availability_visibility: "everyone" | "friends" | "nobody"
  request_permissions: "everyone" | "friends" | "nobody"
  profile_visibility: "everyone" | "friends" | "nobody"
  show_online_status: boolean
  show_location: boolean
  allow_friend_requests: boolean
}

export function PrivacySettingsModal({ open, onOpenChange }: PrivacySettingsModalProps) {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [settings, setSettings] = useState<PrivacySettings>({
    availability_visibility: "friends",
    request_permissions: "friends",
    profile_visibility: "friends",
    show_online_status: true,
    show_location: true,
    allow_friend_requests: true,
  })

  useEffect(() => {
    if (open) {
      loadPrivacySettings()
    }
  }, [open])

  const loadPrivacySettings = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Get privacy settings from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("privacy_settings")
        .eq("id", user.id)
        .single()

      if (error) throw error

      if (data?.privacy_settings) {
        setSettings(data.privacy_settings)
      }
    } catch (error) {
      console.error("Error loading privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to load privacy settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const savePrivacySettings = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Update privacy settings in profiles table
      const { error } = await supabase
        .from("profiles")
        .update({ privacy_settings: settings })
        .eq("id", user.id)

      if (error) throw error

      toast({
        title: "Success",
        description: "Privacy settings updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error saving privacy settings:", error)
      toast({
        title: "Error",
        description: "Failed to save privacy settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Shield className="w-5 h-5" />
            Privacy Settings
          </DialogTitle>
          <DialogDescription>
            Control who can see your information and interact with you
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading settings...</div>
        ) : (
          <div className="space-y-6 pt-4">
            {/* Availability Visibility */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Eye className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-base font-semibold">Who can see my availability?</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Control who can view when you're available to hang out
                    </p>
                  </div>
                  <Select
                    value={settings.availability_visibility}
                    onValueChange={(value: any) =>
                      setSettings({ ...settings, availability_visibility: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Request Permissions */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Bell className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-base font-semibold">Who can send me hangout requests?</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Choose who can send you requests to hang out
                    </p>
                  </div>
                  <Select
                    value={settings.request_permissions}
                    onValueChange={(value: any) => setSettings({ ...settings, request_permissions: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Profile Visibility */}
            <Card className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-base font-semibold">Who can see my profile?</Label>
                    <p className="text-sm text-muted-foreground mt-1">
                      Control who can view your profile information
                    </p>
                  </div>
                  <Select
                    value={settings.profile_visibility}
                    onValueChange={(value: any) => setSettings({ ...settings, profile_visibility: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="everyone">Everyone</SelectItem>
                      <SelectItem value="friends">Friends Only</SelectItem>
                      <SelectItem value="nobody">Nobody</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Additional Privacy Options */}
            <Card className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary" />
                <Label className="text-base font-semibold">Additional Privacy Options</Label>
              </div>

              <div className="space-y-4 pl-8">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show online status</Label>
                    <p className="text-sm text-muted-foreground">Let friends see when you're online</p>
                  </div>
                  <Switch
                    checked={settings.show_online_status}
                    onCheckedChange={(checked) => setSettings({ ...settings, show_online_status: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Show location</Label>
                    <p className="text-sm text-muted-foreground">Display your location on your profile</p>
                  </div>
                  <Switch
                    checked={settings.show_location}
                    onCheckedChange={(checked) => setSettings({ ...settings, show_location: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Allow friend requests</Label>
                    <p className="text-sm text-muted-foreground">Let people send you friend requests</p>
                  </div>
                  <Switch
                    checked={settings.allow_friend_requests}
                    onCheckedChange={(checked) => setSettings({ ...settings, allow_friend_requests: checked })}
                  />
                </div>
              </div>
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                Cancel
              </Button>
              <Button onClick={savePrivacySettings} disabled={isSaving} className="flex-1">
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

