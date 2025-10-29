"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Settings, Bell, Moon, Globe, Trash2, Mail, Lock, Palette } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import { useRouter } from "next/navigation"

interface SettingsModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface AppSettings {
  notifications_enabled: boolean
  email_notifications: boolean
  push_notifications: boolean
  theme: "light" | "dark" | "system"
  language: string
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { toast } = useToast()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [settings, setSettings] = useState<AppSettings>({
    notifications_enabled: true,
    email_notifications: true,
    push_notifications: true,
    theme: "system",
    language: "en",
  })

  useEffect(() => {
    if (open) {
      loadSettings()
    }
  }, [open])

  const loadSettings = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      setUserEmail(user.email || "")

      // Get app settings from profiles table
      const { data, error } = await supabase
        .from("profiles")
        .select("app_settings")
        .eq("id", user.id)
        .single()

      if (error) throw error

      if (data?.app_settings) {
        setSettings(data.app_settings)
      }
    } catch (error) {
      console.error("Error loading settings:", error)
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const saveSettings = async () => {
    setIsSaving(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Update app settings in profiles table
      const { error } = await supabase.from("profiles").update({ app_settings: settings }).eq("id", user.id)

      if (error) throw error

      // Apply theme if changed
      if (settings.theme === "dark") {
        document.documentElement.classList.add("dark")
      } else if (settings.theme === "light") {
        document.documentElement.classList.remove("dark")
      } else {
        // System theme
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches
        if (isDark) {
          document.documentElement.classList.add("dark")
        } else {
          document.documentElement.classList.remove("dark")
        }
      }

      toast({
        title: "Success",
        description: "Settings updated successfully",
      })

      onOpenChange(false)
    } catch (error) {
      console.error("Error saving settings:", error)
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteAccount = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error("Not authenticated")
      }

      // Delete user profile and related data
      const { error } = await supabase.from("profiles").delete().eq("id", user.id)

      if (error) throw error

      // Sign out
      await supabase.auth.signOut()

      toast({
        title: "Account deleted",
        description: "Your account has been permanently deleted",
      })

      router.push("/login")
    } catch (error) {
      console.error("Error deleting account:", error)
      toast({
        title: "Error",
        description: "Failed to delete account. Please contact support.",
        variant: "destructive",
      })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Settings className="w-5 h-5" />
              Settings
            </DialogTitle>
            <DialogDescription>Manage your account and app preferences</DialogDescription>
          </DialogHeader>

          {isLoading ? (
            <div className="py-8 text-center text-muted-foreground">Loading settings...</div>
          ) : (
            <div className="space-y-6 pt-4">
              {/* Account Information */}
              <Card className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-base font-semibold">Account</Label>
                      <p className="text-sm text-muted-foreground mt-1">Your account information</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Email</Label>
                      <Input value={userEmail} disabled className="bg-muted" />
                    </div>
                  </div>
                </div>
              </Card>

              {/* Notifications */}
              <Card className="p-4 space-y-4">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-primary" />
                  <Label className="text-base font-semibold">Notifications</Label>
                </div>

                <div className="space-y-4 pl-8">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Enable notifications</Label>
                      <p className="text-sm text-muted-foreground">Receive notifications for hangout requests</p>
                    </div>
                    <Switch
                      checked={settings.notifications_enabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, notifications_enabled: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Email notifications</Label>
                      <p className="text-sm text-muted-foreground">Get notified via email</p>
                    </div>
                    <Switch
                      checked={settings.email_notifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, email_notifications: checked })}
                      disabled={!settings.notifications_enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Push notifications</Label>
                      <p className="text-sm text-muted-foreground">Get push notifications on your device</p>
                    </div>
                    <Switch
                      checked={settings.push_notifications}
                      onCheckedChange={(checked) => setSettings({ ...settings, push_notifications: checked })}
                      disabled={!settings.notifications_enabled}
                    />
                  </div>
                </div>
              </Card>

              {/* Appearance */}
              <Card className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Palette className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-base font-semibold">Appearance</Label>
                      <p className="text-sm text-muted-foreground mt-1">Customize how the app looks</p>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Theme</Label>
                      <Select value={settings.theme} onValueChange={(value: any) => setSettings({ ...settings, theme: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Language */}
              <Card className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <Globe className="w-5 h-5 text-primary mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-base font-semibold">Language</Label>
                      <p className="text-sm text-muted-foreground mt-1">Choose your preferred language</p>
                    </div>
                    <Select
                      value={settings.language}
                      onValueChange={(value) => setSettings({ ...settings, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Español</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="de">Deutsch</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </Card>

              {/* Danger Zone */}
              <Card className="p-4 space-y-3 border-destructive/50">
                <div className="flex items-start gap-3">
                  <Trash2 className="w-5 h-5 text-destructive mt-0.5" />
                  <div className="flex-1 space-y-3">
                    <div>
                      <Label className="text-base font-semibold text-destructive">Danger Zone</Label>
                      <p className="text-sm text-muted-foreground mt-1">Irreversible actions</p>
                    </div>
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} className="w-full">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={saveSettings} disabled={isSaving} className="flex-1">
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account and remove all your data from our
              servers, including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Your profile and personal information</li>
                <li>All your availability records</li>
                <li>All your hangout requests and plans</li>
                <li>Your friend connections</li>
                <li>Your groups and memberships</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
              Delete Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

