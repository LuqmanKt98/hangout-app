"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Users, Calendar, Zap, Check } from "lucide-react"
import { updateProfile } from "@/lib/api/profile"
import { useToast } from "@/hooks/use-toast"
import { VisuallyHidden } from "@radix-ui/react-visually-hidden"

type OnboardingModalProps = {
  open: boolean
  onComplete: () => void
}

const steps = [
  {
    title: "Welcome to Avale!",
    description: "Turning We should really hang out sometime! into IRL plans",
    icon: Zap,
    content: (
      <div className="space-y-3 sm:space-y-4">
        <p className="text-muted-foreground text-center text-sm sm:text-base">
          Stop the endless group chat back-and-forth. Share when you're free and see who's available to hang.
        </p>
        <div className="grid gap-2 sm:gap-3 pt-2 sm:pt-4">
          <Card className="p-3 sm:p-4 bg-primary/5 border-primary/20">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Share Your Availability</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Let friends know when you're free and what vibe you're going for
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-energy-high/5 border-energy-high/20">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-energy-high/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 text-energy-high" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">See Who's Free</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Check your friends' availability and send hangout requests instantly
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-energy-low/5 border-energy-low/20">
            <div className="flex items-start gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-energy-low/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-energy-low" />
              </div>
              <div>
                <h4 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Make Plans Happen</h4>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Coordinate details through messages and confirm your hangout
                </p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    ),
  },
  {
    title: "Add Your Friends",
    description: "Connect with friends to start coordinating hangouts",
    icon: Users,
    content: (
      <div className="space-y-3 sm:space-y-4">
        <p className="text-muted-foreground text-center text-sm sm:text-base">
          Search for friends by name or email and send them a friend request. Once they accept, you'll be able to see
          each other's availability.
        </p>
        <Card className="p-4 sm:p-6 bg-muted/50 border-dashed">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Users className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Go to Profile Tab</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tap the profile icon in the bottom navigation, then tap "Add" to search for friends
              </p>
            </div>
          </div>
        </Card>
      </div>
    ),
  },
  {
    title: "Share Your Availability",
    description: "Let friends know when you're free to hang out",
    icon: Calendar,
    content: (
      <div className="space-y-3 sm:space-y-4">
        <p className="text-muted-foreground text-center text-sm sm:text-base">
          Set your availability for specific times or turn on "Available Now" when you're spontaneously free. Choose
          your energy level to let friends know what kind of hangout you're up for.
        </p>
        <div className="space-y-2 sm:space-y-3">
          <Card className="p-3 sm:p-4 bg-energy-high/5 border-energy-high/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-energy-high flex items-center justify-center text-white font-bold text-sm">
                H
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-xs sm:text-sm">High Energy</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Dinner, drinks, dancing, adventures</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-energy-low/5 border-energy-low/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-energy-low flex items-center justify-center text-white font-bold text-sm">
                L
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-xs sm:text-sm">Low Energy</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Coffee, walks, chill hangs</p>
              </div>
            </div>
          </Card>
          <Card className="p-3 sm:p-4 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold text-sm">
                V
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-xs sm:text-sm">Virtual</h4>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Video calls, gaming, watch parties</p>
              </div>
            </div>
          </Card>
        </div>
        <Card className="p-4 sm:p-6 bg-muted/50 border-dashed">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm sm:text-base mb-0.5 sm:mb-1">Go to My Avales Tab</h4>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Tap the calendar icon to add your availability or turn on "Available Now"
              </p>
            </div>
          </div>
        </Card>
      </div>
    ),
  },
  {
    title: "You're All Set!",
    description: "Start coordinating hangouts with your friends",
    icon: Check,
    content: (
      <div className="space-y-3 sm:space-y-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary/10 mx-auto flex items-center justify-center mb-2 sm:mb-4">
          <Check className="w-8 h-8 sm:w-10 sm:h-10 text-primary" />
        </div>
        <p className="text-muted-foreground text-center text-sm sm:text-base">
          You're ready to start using Avale! Here's a quick recap of what you can do:
        </p>
        <div className="space-y-2">
          <Card className="p-2.5 sm:p-3 bg-muted/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-primary">1</span>
              </div>
              <p className="text-xs sm:text-sm">Add friends from the Profile tab</p>
            </div>
          </Card>
          <Card className="p-2.5 sm:p-3 bg-muted/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-primary">2</span>
              </div>
              <p className="text-xs sm:text-sm">Share your availability from the My Avales tab</p>
            </div>
          </Card>
          <Card className="p-2.5 sm:p-3 bg-muted/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-primary">3</span>
              </div>
              <p className="text-xs sm:text-sm">See who's free and send requests from the Plans tab</p>
            </div>
          </Card>
          <Card className="p-2.5 sm:p-3 bg-muted/30">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-xs sm:text-sm font-bold text-primary">4</span>
              </div>
              <p className="text-xs sm:text-sm">Coordinate details through the Requests tab</p>
            </div>
          </Card>
        </div>
      </div>
    ),
  },
]

export function OnboardingModal({ open, onComplete }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [isCompleting, setIsCompleting] = useState(false)
  const { toast } = useToast()

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleComplete()
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    setIsCompleting(true)
    try {
      await updateProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      toast({
        title: "Welcome aboard!",
        description: "You're all set to start coordinating hangouts.",
      })
      onComplete()
    } catch (error) {
      console.error("Error completing onboarding:", error)
      toast({
        title: "Error",
        description: "Failed to complete onboarding. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsCompleting(false)
    }
  }

  const handleSkip = async () => {
    setIsCompleting(true)
    try {
      await updateProfile({
        onboarding_completed: true,
        onboarding_completed_at: new Date().toISOString(),
      })
      onComplete()
    } catch (error) {
      console.error("Error skipping onboarding:", error)
    } finally {
      setIsCompleting(false)
    }
  }

  const step = steps[currentStep]
  const Icon = step.icon

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" showCloseButton={false}>
        <VisuallyHidden>
          <DialogTitle>{step.title}</DialogTitle>
        </VisuallyHidden>
        <div className="space-y-4 sm:space-y-6 pt-4 sm:pt-6">
          <div className="text-center space-y-2 sm:space-y-3">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-primary/10 mx-auto flex items-center justify-center">
              <Icon className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold mb-1 sm:mb-2">{step.title}</h2>
              <p className="text-muted-foreground text-sm sm:text-base">{step.description}</p>
            </div>
          </div>

          <div>{step.content}</div>

          <div className="flex items-center justify-center gap-2 py-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1.5 sm:h-2 rounded-full transition-all ${
                  index === currentStep ? "w-6 sm:w-8 bg-primary" : "w-1.5 sm:w-2 bg-muted"
                }`}
              />
            ))}
          </div>

          <div className="flex gap-2 sm:gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1 bg-transparent text-sm sm:text-base">
                Back
              </Button>
            )}
            {currentStep === 0 && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                disabled={isCompleting}
                className="flex-1 text-muted-foreground text-sm sm:text-base"
              >
                Skip
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={isCompleting}
              className="flex-1 bg-primary hover:bg-primary/90 text-sm sm:text-base"
            >
              {currentStep === steps.length - 1 ? (isCompleting ? "Finishing..." : "Get Started") : "Next"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
