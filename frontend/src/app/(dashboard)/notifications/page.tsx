"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { Notification } from "@/types";
import { timeAgo } from "@/lib/utils";
import toast from "react-hot-toast";

const TYPE_ICONS: Record<string, string> = {
  new_expense: "💳",
  expense_settled: "✅",
  settlement_request: "💸",
  settlement_completed: "🎉",
  task_assigned: "📋",
  task_due: "⚠️",
  group_invite: "👥",
  balance_reminder: "🔔",
  payment_proof: "📷",
};

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.list(),
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
      toast.success("All marked as read");
    },
  });

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {notifications.some((n) => !n.is_read) && (
          <button
            onClick={() => markAll.mutate()}
            className="text-sm text-brand-600 font-medium hover:underline"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isLoading && (
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-200 rounded-xl" />)}
        </div>
      )}

      {!isLoading && notifications.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
          <p className="text-4xl mb-3">🔔</p>
          <p className="text-gray-400">No notifications yet</p>
        </div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <div
            key={n.id}
            className={`bg-white rounded-xl p-4 shadow-sm flex gap-3 ${!n.is_read ? "border-l-4 border-brand-500" : ""}`}
          >
            <span className="text-xl mt-0.5">{TYPE_ICONS[n.type] || "🔔"}</span>
            <div className="flex-1">
              <p className="font-medium text-sm">{n.title}</p>
              <p className="text-gray-500 text-sm">{n.message}</p>
              <p className="text-gray-400 text-xs mt-1">{timeAgo(n.created_at)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
