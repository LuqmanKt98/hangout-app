"use client"

import { Input } from "@/components/ui/input"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { Flame, Moon, Monitor, CalendarIcon, Plus, X, Clock } from "lucide-react"
import { createBookableAvailability, type TimeSlot } from "@/lib/api/bookable-availability"
import type { EnergyLevel } from "@/lib/api/availability"
import { generateTimeOptions, formatTime12Hour, formatTime24Hour } from "@/lib/utils/timezone"

type CreateBookableLinkModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

const energyLevels = [
  {
    value: "high" as EnergyLevel,
    label: "High Energy",
    icon: Flame,
    description: "Ready for adventure",
    examples: "dinner, drinks, dancing, hiking",
    color: "text-energy-high",
    bgColor: "bg-energy-high/10",
    borderColor: "border-energy-high/30",
  },
  {
    value: "low" as EnergyLevel,
    label: "Low Energy",
    icon: Moon,
    description: "Chill vibes only",
    examples: "coffee, walks, couch hangs",
    color: "text-energy-low",
    bgColor: "bg-energy-low/10",
    borderColor: "border-energy-low/30",
  },
  {
    value: "virtual" as EnergyLevel,
    label: "Virtual",
    icon: Monitor,
    description: "Remote hangouts",
    examples: "video calls, gaming, watch parties",
    color: "text-foreground",
    bgColor: "bg-primary/10",
    borderColor: "border-primary/30",
  },
]

const activityTypes = ["Dinner", "Drinks", "Coffee", "Lunch", "Brunch", "Walk", "Workout", "Movie", "Gaming", "Study"]

// Generate time options in 24-hour format for internal use
const generateTime24HourOptions = (): string[] => {
  const options: string[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      options.push(`${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`)
    }
  }
  return options
}

const timeOptions24Hour = generateTime24HourOptions()

export function CreateBookableLinkModal({ open, onOpenChange, onSuccess }: CreateBookableLinkModalProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [activityType, setActivityType] = useState("")
  const [energyLevel, setEnergyLevel] = useState<EnergyLevel | "">("")
  const [visibleTo, setVisibleTo] = useState<"friends" | "everyone">("friends")
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined)
  const [startTime, setStartTime] = useState("")
  const [endTime, setEndTime] = useState("")
  const [isCreating, setIsCreating] = useState(false)
  const { toast } = useToast()

  const handleStartTimeChange = (time: string) => {
    setStartTime(time)
    if (time) {
      const [hours, minutes] = time.split(":").map(Number)
      const endHours = (hours + 1) % 24
      const endTime = `${endHours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`
      setEndTime(endTime)
    }
  }

  const addTimeSlot = () => {
    if (!selectedDate || !startTime || !endTime) {
      toast({
        title: "Missing information",
        description: "Please select a date and time range.",
        variant: "destructive",
      })
      return
    }

    const newSlot: TimeSlot = {
      date: selectedDate.toISOString().split("T")[0],
      start_time: startTime,
      end_time: endTime,
    }

    setTimeSlots([...timeSlots, newSlot])
    setSelectedDate(undefined)
    setStartTime("")
    setEndTime("")
  }

  const removeTimeSlot = (index: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== index))
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Missing title",
        description: "Please enter a title for your bookable link.",
        variant: "destructive",
      })
      return
    }

    if (timeSlots.length === 0) {
      toast({
        title: "No time slots",
        description: "Please add at least one time slot.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsCreating(true)
      const bookableAvailability = await createBookableAvailability({
        title,
        description,
        activity_type: activityType || "Hangout",
        energy_level: (energyLevel || "low") as EnergyLevel,
        time_slots: timeSlots,
        visible_to: visibleTo,
      })

      const shareUrl = `${window.location.origin}/book/${bookableAvailability.share_token}`

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

      setTitle("")
      setDescription("")
      setActivityType("")
      setEnergyLevel("")
      setVisibleTo("friends")
      setTimeSlots([])
      onOpenChange(false)
      onSuccess()
    } catch (error: any) {
      toast({
        title: "Failed to create link",
        description: error.message || "Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Bookable Link</DialogTitle>
          <DialogDescription>Create a shareable link where friends can book time with you</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              placeholder="e.g., Dinner Availability"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description (optional)</Label>
            <Textarea
              id="description"
              placeholder="Add any details about what you'd like to do..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label>Activity Type (optional)</Label>
            <div className="flex flex-wrap gap-2">
              {activityTypes.map((type) => (
                <Button
                  key={type}
                  type="button"
                  variant={activityType === type ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActivityType(type)}
                  className={activityType === type ? "" : "bg-transparent"}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <Label>Energy Level (optional)</Label>
            <RadioGroup value={energyLevel} onValueChange={(v) => setEnergyLevel(v as EnergyLevel)}>
              {energyLevels.map((energy) => {
                const Icon = energy.icon
                return (
                  <div key={energy.value} className="flex items-start space-x-3">
                    <RadioGroupItem value={energy.value} id={`bookable-${energy.value}`} className="mt-1" />
                    <Label htmlFor={`bookable-${energy.value}`} className="flex-1 cursor-pointer">
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

          <div className="space-y-3">
            <Label>Available Time Slots</Label>
            <div className="space-y-2 p-3 border rounded-lg bg-muted/30">
              <div className="space-y-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal bg-background">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate
                        ? selectedDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : "Select date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-2">
                <div className="space-y-1">
                  <Label htmlFor="slotStartTime" className="text-xs">
                    Start Time
                  </Label>
                  <Select value={startTime} onValueChange={handleStartTimeChange}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select start time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {timeOptions24Hour.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTime12Hour(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="slotEndTime" className="text-xs">
                    End Time
                  </Label>
                  <Select value={endTime} onValueChange={setEndTime}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Select end time" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {timeOptions24Hour.map((time) => (
                        <SelectItem key={time} value={time}>
                          {formatTime12Hour(time)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={addTimeSlot} className="w-full bg-transparent">
                <Plus className="w-4 h-4 mr-2" />
                Add Time Slot
              </Button>
            </div>

            {timeSlots.length > 0 && (
              <div className="space-y-2">
                {timeSlots.map((slot, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded-lg bg-background">
                    <div className="flex items-center gap-2 text-sm">
                      <CalendarIcon className="w-4 h-4 text-muted-foreground" />
                      <span>
                        {new Date(slot.date).toLocaleDateString("en-US", {
                          weekday: "short",
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <Clock className="w-4 h-4 text-muted-foreground ml-2" />
                      <span>
                        {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTimeSlot(index)}
                      className="h-8 w-8 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Who can book?</Label>
            <RadioGroup value={visibleTo} onValueChange={(v) => setVisibleTo(v as "friends" | "everyone")}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="friends" id="friends" />
                <Label htmlFor="friends" className="cursor-pointer">
                  Any Avale Friends
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="everyone" id="everyone" />
                <Label htmlFor="everyone" className="cursor-pointer">
                  Anyone with the link
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1 bg-transparent" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button className="flex-1 bg-primary hover:bg-primary/90" onClick={handleCreate} disabled={isCreating}>
              {isCreating ? "Creating..." : "Create Link"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
