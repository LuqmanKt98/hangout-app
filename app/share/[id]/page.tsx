"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar, Clock, Zap, ArrowRight } from "lucide-react"

interface SharedAvailability {
  id: string
  userName: string
  date: string
  time: string
  energyLevel: "low" | "medium" | "high"
  message?: string
  tags?: string[]
  createdAt: string
  expiresAt: string
}

export default function SharePage() {
  const params = useParams()
  const router = useRouter()
  const [availability, setAvailability] = useState<SharedAvailability | null>(null)
  const [isExpired, setIsExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const shareId = params.id as string

    // Fetch shared availability from localStorage
    const sharedAvailabilityData = localStorage.getItem("sharedAvailability")
    if (sharedAvailabilityData) {
      const allShared = JSON.parse(sharedAvailabilityData)
      const shared = allShared.find((s: SharedAvailability) => s.id === shareId)

      if (shared) {
        // Check if expired (7 days)
        const expiresAt = new Date(shared.expiresAt)
        const now = new Date()

        if (now > expiresAt) {
          setIsExpired(true)
        } else {
          setAvailability(shared)
        }
      }
    }

    setIsLoading(false)
  }, [params.id])

  const getEnergyColor = (level: string) => {
    switch (level) {
      case "low":
        return "bg-blue-500/10 text-blue-600 border-blue-200"
      case "medium":
        return "bg-yellow-500/10 text-yellow-600 border-yellow-200"
      case "high":
        return "bg-green-500/10 text-green-600 border-green-200"
      default:
        return "bg-gray-500/10 text-gray-600 border-gray-200"
    }
  }

  const getEnergyLabel = (level: string) => {
    switch (level) {
      case "low":
        return "Low Energy"
      case "medium":
        return "Medium Energy"
      case "high":
        return "High Energy"
      default:
        return level
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (isExpired) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
          <p className="text-muted-foreground mb-6">
            This availability link has expired. Shared links are only valid for 7 days.
          </p>
          <Button onClick={() => router.push("/")} className="w-full">
            Go to App
          </Button>
        </Card>
      </div>
    )
  }

  if (!availability) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Calendar className="w-8 h-8 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
          <p className="text-muted-foreground mb-6">This availability link doesn't exist or has been removed.</p>
          <Button onClick={() => router.push("/")} className="w-full">
            Go to App
          </Button>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-xl font-bold">vibecoded</h1>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Card className="p-6 mb-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold mb-2">{availability.userName} is available!</h2>
            <p className="text-muted-foreground">They want to hang out with you</p>
          </div>

          {/* Availability Details */}
          <div className="space-y-4 mb-6">
            <div className="flex items-start gap-3">
              <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Date</p>
                <p className="text-muted-foreground">{availability.date}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Time</p>
                <p className="text-muted-foreground">{availability.time}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">Energy Level</p>
                <Badge variant="outline" className={`mt-1 ${getEnergyColor(availability.energyLevel)}`}>
                  {getEnergyLabel(availability.energyLevel)}
                </Badge>
              </div>
            </div>

            {/* Activity Tags */}
            {availability.tags && availability.tags.length > 0 && (
              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium mb-2">Activities</p>
                  <div className="flex flex-wrap gap-1.5">
                    {availability.tags.map((tag, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="bg-primary/10 text-primary border-primary/20 text-xs px-2 py-0.5"
                      >
                        #{tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="space-y-3">
            <Button onClick={() => router.push("/")} className="w-full" size="lg">
              Sign Up to Send Request
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <button onClick={() => router.push("/")} className="text-primary hover:underline font-medium">
                Log in
              </button>
            </p>
          </div>
        </Card>

        {/* App Info */}
        <Card className="p-6 bg-primary/5 border-primary/20">
          <h3 className="font-semibold mb-2">What is vibecoded?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            vibecoded helps you coordinate spontaneous hangouts with friends. Share your availability, send requests,
            and make plans—all in one place.
          </p>
          <Button variant="outline" onClick={() => router.push("/")} className="w-full">
            Learn More
          </Button>
        </Card>
      </div>
    </div>
  )
}
