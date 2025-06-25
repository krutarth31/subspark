"use client";

import DashboardLayout from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { useNotifications } from "@/hooks/use-notifications";

export default function NotificationsPage() {
  const { notifications, markAllRead } = useNotifications();
  const help = <p>View recent notifications.</p>;
  return (
    <DashboardLayout title="Notifications" helpContent={help}>
      <div className="p-6 space-y-4">
        <Button onClick={markAllRead} disabled={notifications.length === 0}>
          Mark all read
        </Button>
        {notifications.length === 0 ? (
          <p>No notifications.</p>
        ) : (
          <ul className="space-y-2">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="border rounded-md p-2 text-sm"
              >
                <div>{n.message}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(n.date).toLocaleString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
