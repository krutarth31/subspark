"use client";

import { useEffect, useState } from "react";

export type Notification = {
  id: string;
  message: string;
  date: string;
  read: boolean;
};

export function useNotifications() {
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

  function addNotification(message: string) {
    const n: Notification = {
      id: Date.now().toString(),
      message,
      date: new Date().toISOString(),
      read: false,
    };
    setNotifications((prev) => [n, ...prev]);
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return { notifications, addNotification, markAllRead };
}
