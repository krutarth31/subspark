"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useContext,
  useRef,
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
  const prevIds = useRef<Set<string>>(new Set());
  const prevStatuses = useRef<Record<string, string | undefined>>({});

  useEffect(() => {
    if (role !== "seller") return;

    const load = async () => {
      const res = await fetch("/api/buyers");
      const data = await res.json().catch(() => ({}));
      const buyers = (data.buyers || []) as Array<{
        _id: string;
        productName: string;
        buyerName?: string;
        buyerEmail?: string;
        refundRequest?: { status: string };
      }>;
      buyers.forEach((b) => {
        if (prevIds.current.size > 0 && !prevIds.current.has(b._id)) {
          addNotification(
            `New purchase of ${b.productName} by ${b.buyerName || b.buyerEmail}`,
          );
        }
        prevIds.current.add(b._id);
        const status = b.refundRequest?.status;
        if (
          prevStatuses.current[b._id] &&
          prevStatuses.current[b._id] !== status &&
          status === "requested"
        ) {
          addNotification(`Refund requested for ${b.productName}`);
        }
        prevStatuses.current[b._id] = status;
      });
    };

    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
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
