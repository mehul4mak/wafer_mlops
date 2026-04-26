"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", icon: "🏠", label: "Dashboard" },
  { href: "/groups", icon: "👥", label: "Groups" },
  { href: "/notifications", icon: "🔔", label: "Notifications" },
  { href: "/profile", icon: "👤", label: "Profile" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-2xl">💰</span>
          <span className="text-xl font-bold text-gray-900">SplitMate</span>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {NAV.map(({ href, icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors",
              pathname.startsWith(href)
                ? "bg-brand-50 text-brand-700"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <span className="text-xl">{icon}</span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 mb-3 px-2">
          <div className="w-8 h-8 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-semibold text-sm">
            {user?.full_name?.[0] || user?.email?.[0] || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.full_name || "User"}</p>
            <p className="text-xs text-gray-400 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
