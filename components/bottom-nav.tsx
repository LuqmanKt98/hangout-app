"use client"

import { Calendar, Clock, Send, User, MessageCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface BottomNavProps {
  activeTab: "plans" | "availability" | "requests" | "chat" | "profile"
  onTabChange: (tab: "plans" | "availability" | "requests" | "chat" | "profile") => void
  notificationCount?: number
  chatNotificationCount?: number
}

export function BottomNav({ activeTab, onTabChange, notificationCount = 0, chatNotificationCount = 0 }: BottomNavProps) {
  const tabs = [
    { id: "plans" as const, label: "Plans", icon: Calendar },
    { id: "availability" as const, label: "My Avales", icon: Clock },
    { id: "requests" as const, label: "Requests", icon: Send },
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "profile" as const, label: "You", icon: User },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border backdrop-blur-xl bg-card/80 z-50">
      <div className="max-w-lg mx-auto px-2 py-2">
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const showBadge = (tab.id === "requests" && notificationCount > 0) || (tab.id === "chat" && chatNotificationCount > 0)
            const badgeCount = tab.id === "chat" ? chatNotificationCount : notificationCount

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200",
                  isActive
                    ? "text-foreground bg-[#E8B8FE]/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
                )}
              >
                <div className={cn("relative transition-all duration-200", isActive && "scale-110")}>
                  <Icon className="w-5 h-5" />
                  {showBadge && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full flex items-center justify-center">
                      <span className="text-[10px] font-bold text-white">
                        {badgeCount > 9 ? "9+" : badgeCount}
                      </span>
                    </div>
                  )}
                </div>
                <span className={cn("text-xs font-medium transition-all duration-200", isActive && "font-semibold")}>
                  {tab.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
