"use client"

import { useState, useEffect } from "react"
import { PlansTab } from "@/components/tabs/plans-tab"
import { AvailabilityTab } from "@/components/tabs/availability-tab"
import { RequestsTab } from "@/components/tabs/requests-tab"
import { ProfileTab } from "@/components/tabs/profile-tab"
import { BottomNav } from "@/components/bottom-nav"
import { OnboardingModal } from "@/components/onboarding-modal"
import { useRealtimeRequests, useRealtimeAvailability } from "@/lib/hooks/use-realtime-updates"
import { createClient } from "@/lib/supabase/client"
import { ErrorBoundary } from "@/components/error-boundary"
import { ensureProfileExists } from "@/lib/api/profile"
import type { SupabaseClient } from "@supabase/supabase-js"

export const dynamic = "force-dynamic"

function HomeContent() {
  const [activeTab, setActiveTab] = useState<"plans" | "availability" | "requests" | "profile">("plans")
  const [userId, setUserId] = useState<string | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingChecked, setOnboardingChecked] = useState(false)
  const [supabase, setSupabase] = useState<SupabaseClient | null>(null)

  useEffect(() => {
    try {
      const client = createClient()
      setSupabase(client)
    } catch (err) {
      console.error("[v0] Failed to create Supabase client:", err)
      setError("Failed to initialize app. Please check your connection.")
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!supabase) {
      return
    }

    const getUser = async () => {
      try {
        console.log("[v0] Fetching user...")
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          console.error("[v0] Error getting user:", userError)
          setError("Failed to load user data")
        } else {
          console.log("[v0] User loaded:", user?.id)
          setUserId(user?.id)

          if (user) {
            try {
              await ensureProfileExists()
            } catch (profileError) {
              console.error("[v0] Failed to ensure profile exists:", profileError)
            }

            try {
              const { data: profile, error } = await supabase
                .from("profiles")
                .select("onboarding_completed")
                .eq("id", user.id)
                .maybeSingle()

              // If column doesn't exist (400 error) or no data, skip onboarding check
              if (!error && profile && profile.onboarding_completed === false) {
                setShowOnboarding(true)
              }
            } catch (err) {
              // Silently skip onboarding if there's an error (e.g., column doesn't exist)
            }
            setOnboardingChecked(true)
          }
        }
      } catch (error) {
        console.error("[v0] Exception getting user:", error)
        setError("An unexpected error occurred")
      } finally {
        setIsLoading(false)
      }
    }
    getUser()
  }, [supabase])

  const { newRequestCount, resetCount } = useRealtimeRequests(userId)
  const { availabilityUpdated } = useRealtimeAvailability()

  useEffect(() => {
    const handleTabSwitch = (event: any) => {
      setActiveTab(event.detail)
    }

    window.addEventListener("switchTab", handleTabSwitch)

    return () => {
      window.removeEventListener("switchTab", handleTabSwitch)
    }
  }, [])

  useEffect(() => {
    if (activeTab === "requests") {
      resetCount()
    }
  }, [activeTab, resetCount])

  const handleOnboardingComplete = () => {
    setShowOnboarding(false)
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold text-foreground">Error</h1>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
          >
            Reload
          </button>
        </div>
      </div>
    )
  }

  if (isLoading || !onboardingChecked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Main content area */}
      <main className="h-[calc(100vh-5rem)] overflow-y-auto">
        {activeTab === "plans" && <PlansTab />}
        {activeTab === "availability" && <AvailabilityTab />}
        {activeTab === "requests" && <RequestsTab />}
        {activeTab === "profile" && <ProfileTab />}
      </main>

      {/* Bottom navigation */}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} notificationCount={newRequestCount} />

      <OnboardingModal open={showOnboarding} onComplete={handleOnboardingComplete} />
    </div>
  )
}

export default function Home() {
  return (
    <ErrorBoundary>
      <HomeContent />
    </ErrorBoundary>
  )
}
