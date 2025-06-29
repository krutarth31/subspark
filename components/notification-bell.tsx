"use client"

import { IconNotification } from "@tabler/icons-react"
import { Badge } from "@/components/ui/badge"
import { useNotifications } from "@/hooks/use-notifications"

export function NotificationBell() {
  const { unreadCount } = useNotifications()
  return (
    <a href="/notifications" className="relative inline-flex" aria-label="Notifications">
      <IconNotification />
      {unreadCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 rounded-full px-1 text-[10px]"
        >
          {unreadCount}
        </Badge>
      )}
    </a>
  )
}
