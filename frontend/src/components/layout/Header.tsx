"use client";

import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import Link from "next/link";

export default function Header() {
  const { data: countData } = useQuery({
    queryKey: ["notification-count"],
    queryFn: notificationsApi.count,
    refetchInterval: 60_000,
  });

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-end gap-4">
      <Link href="/notifications" className="relative p-2 rounded-xl hover:bg-gray-50 transition-colors">
        <span className="text-xl">🔔</span>
        {countData?.unread_count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
            {countData.unread_count > 9 ? "9+" : countData.unread_count}
          </span>
        )}
      </Link>
    </header>
  );
}
