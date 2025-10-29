"use client"

import { useEffect, useState, useMemo } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Flame, Moon, Monitor, CalendarIcon, Clock, Loader2 } from "lucide-react"
import {
  getBookableAvailabilityByToken,
  createBooking,
  type BookableAvailabilityWithProfile,
  type TimeSlot,
} from "@/lib/api/bookable-availability"
import { useToast } from "@/hooks/use-toast"
import { createClient } from "@/lib/supabase/client"

const energyLevels = {
  high: {
    label: "High Energy",
    icon: Flame,
    color: "text-energy-high",
    bgColor: "bg-energy-high/10",
    borderColor: "border-energy-high/30",
  },
  low: {
    label: "Low Energy",
    icon: Moon,
    color: "text-energy-low",
    bgColor: "bg-energy-low/10",
    borderColor: "border-energy-low/30",
  },
  virtual: {
    label: "Virtual",
    icon: Monitor,
    color: "text-foreground",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
}

export const dynamic = "force-dynamic"

export default function BookingPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [bookableAvailability, setBookableAvailability] = useState<BookableAvailabilityWithProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  const supabase = useMemo(() => {
    try {
      return createClient()
    } catch (err) {
      console.error("[v0] Failed to create Supabase client:", err)
      return null
    }
  }, [])

  useEffect(() => {
    loadBookableAvailability()
    checkAuth()
  }, [params.token])

  const checkAuth = async () => {
    if (!supabase) return

    const {
      data: { user },
    } = await supabase.auth.getUser()
    setIsAuthenticated(!!user)
  }

  const loadBookableAvailability = async () => {
    try {
      setIsLoading(true)
      const data = await getBookableAvailabilityByToken(params.token as string)
      setBookableAvailability(data)
    } catch (error: any) {
      toast({
        title: "Link not found",
        description: error.message || "This booking link may have expired or been removed.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBookSlot = async (slot: TimeSlot) => {
    if (!isAuthenticated) {
      toast({
        title: "Sign in required",
        description: "Please sign in to book a time slot.",
      })
      router.push(`/auth/login?redirect=/book/${params.token}`)
      return
    }

    if (!bookableAvailability) return

    try {
      setIsBooking(true)
      setSelectedSlot(slot)
      await createBooking({
        bookable_availability_id: bookableAvailability.id,
        selected_slot: slot,
      })

      toast({
        title: "Time booked!",
        description: "Your booking request has been sent. You'll be notified when it's confirmed.",
      })

      router.push("/")
    } catch (error: any) {
      toast({
        title: "Booking failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsBooking(false)
      setSelectedSlot(null)
    }
  }

  const formatTime12Hour = (time24: string): string => {
    if (!time24) return ""
    const [hours, minutes] = time24.split(":").map(Number)
    const period = hours >= 12 ? "PM" : "AM"
    const hours12 = hours % 12 || 12
    return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading booking details...</p>
        </div>
      </div>
    )
  }

  if (!bookableAvailability) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4">
        <Card className="p-8 text-center max-w-md">
          <h1 className="text-2xl font-bold mb-2">Link Not Found</h1>
          <p className="text-muted-foreground">This booking link may have expired or been removed.</p>
        </Card>
      </div>
    )
  }

  const energyConfig = energyLevels[bookableAvailability.energy_level]
  const EnergyIcon = energyConfig.icon

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        <Card className="p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={bookableAvailability.profile.avatar_url || "/placeholder.svg"} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                {bookableAvailability.profile.display_name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h1 className="text-2xl font-bold mb-1">{bookableAvailability.title}</h1>
              <p className="text-muted-foreground mb-2">with {bookableAvailability.profile.display_name}</p>
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={`${energyConfig.bgColor} ${energyConfig.color} ${energyConfig.borderColor}`}
                >
                  <EnergyIcon className="w-3 h-3 mr-1" />
                  {bookableAvailability.activity_type}
                </Badge>
                <Badge variant="outline">{energyConfig.label}</Badge>
              </div>
            </div>
          </div>
          {bookableAvailability.description && (
            <p className="text-sm text-muted-foreground">{bookableAvailability.description}</p>
          )}
        </Card>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Select a time</h2>
          {bookableAvailability.time_slots.map((slot, index) => (
            <Card
              key={index}
              className="p-4 hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => handleBookSlot(slot)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">
                      {new Date(slot.date).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  disabled={isBooking && selectedSlot === slot}
                  onClick={(e) => {
                    e.stopPropagation()
                    handleBookSlot(slot)
                  }}
                >
                  {isBooking && selectedSlot === slot ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Booking...
                    </>
                  ) : (
                    "Book"
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {!isAuthenticated && (
          <Card className="p-4 mt-6 bg-muted/50">
            <p className="text-sm text-center text-muted-foreground">You'll need to sign in to book a time slot</p>
          </Card>
        )}
      </div>
    </div>
  )
}
