import { useState, useEffect, useCallback } from "react";
import { api } from "../api/client";

const POLL_INTERVAL_MS = 30000;

export function useNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const refetchUnreadCount = useCallback(() => {
    api.get("/notifications/unread-count")
      .then((data) => setUnreadCount(data.count))
      .catch(() => {});
  }, []);

  const refetchList = useCallback(() => {
    setLoading(true);
    api.get("/notifications/?limit=20")
      .then(setNotifications)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    refetchUnreadCount();
    const interval = setInterval(refetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [refetchUnreadCount]);

  async function markRead(id) {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // silent — worst case the item just stays marked unread until next refetch
    }
  }

  async function markAllRead() {
    try {
      await api.patch("/notifications/mark-all-read");
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {
      // silent, same reasoning
    }
  }

  return { notifications, unreadCount, loading, refetchList, markRead, markAllRead };
}