"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
} from "react";
import { toast } from "sonner";
import { useUserRole } from "@/hooks/use-user-role";

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

  const { role } = useUserRole();

  useEffect(() => {
    if (role !== "seller") return;

    const base = process.env.NEXT_PUBLIC_BACKEND_URL || "";
    const wsBase = base
      ? base.replace(/^http/, "ws")
      : `${window.location.protocol === "https:" ? "wss" : "ws"}://${
          window.location.host
        }`;
    const ws = new WebSocket(`${wsBase}/api/buyers/ws`);

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === "purchase") {
          const p = msg.purchase as { productName: string; buyerName?: string; buyerEmail?: string };
          addNotification(`New purchase of ${p.productName} by ${p.buyerName || p.buyerEmail}`);
        }
        if (msg.type === "refund_requested") {
          const p = msg.purchase as { productName: string };
          addNotification(`Refund requested for ${p.productName}`);
        }
      } catch (_) {
        // ignore malformed messages
      }
    };

    return () => {
      ws.close();
    };
  }, [role, addNotification]);

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
