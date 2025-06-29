"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import { toast } from "sonner";

export type Notification = {
  id: string;
  message: string;
  date: string;
  read: boolean;
};

type NotificationsContextValue = {
  notifications: Notification[];
  addNotification: (message: string) => void;
  markAllRead: () => void;
  unreadCount: number;
};

const NotificationsContext = React.createContext<NotificationsContextValue | undefined>(
  undefined,
);

export function NotificationsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("notifications");
    if (stored) {
      try {
        setNotifications(JSON.parse(stored));
      } catch (_) {
        // ignore parse errors
      }
    }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem("notifications", JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = useCallback((message: string) => {
    const n: Notification = {
      id: Date.now().toString(),
      message,
      date: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [n, ...prev]);
    toast(message);
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications],
  );

  const value = useMemo(
    () => ({ notifications, addNotification, markAllRead, unreadCount }),
    [notifications, addNotification, markAllRead, unreadCount],
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) {
    throw new Error(
      "useNotifications must be used within NotificationsProvider",
    );
  }
  return ctx;
}
