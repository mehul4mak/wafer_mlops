"use client";

import { useQuery } from "@tanstack/react-query";
import { dashboardApi } from "@/lib/api";
import { formatCurrency, balanceColor } from "@/lib/utils";
import { DashboardData } from "@/types";
import { useAuthStore } from "@/store/auth";
import Link from "next/link";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: dashboardApi.get,
  });

  if (isLoading) return <DashboardSkeleton />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Good morning, {user?.full_name?.split(" ")[0] || "there"} 👋
        </h1>
        <p className="text-gray-500 mt-1">Here's your financial overview</p>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="You are owed"
          value={formatCurrency(data?.total_owed ?? 0)}
          color="text-green-600"
          bg="bg-green-50"
          icon="💚"
        />
        <StatCard
          label="You owe"
          value={formatCurrency(data?.total_owe ?? 0)}
          color="text-red-500"
          bg="bg-red-50"
          icon="❤️"
        />
        <StatCard
          label="Active groups"
          value={String(data?.active_groups ?? 0)}
          color="text-blue-600"
          bg="bg-blue-50"
          icon="👥"
        />
        <StatCard
          label="Pending tasks"
          value={String(data?.pending_tasks ?? 0)}
          color="text-orange-500"
          bg="bg-orange-50"
          icon="📋"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Chart */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Monthly Spending</h2>
          {data?.monthly_spend && data.monthly_spend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthly_spend}>
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => formatCurrency(Number(v))} />
                <Bar dataKey="total" fill="#22c55e" radius={[4, 4, 0, 0]} name="Total" />
                <Bar dataKey="my_share" fill="#86efac" radius={[4, 4, 0, 0]} name="My Share" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-52 flex items-center justify-center text-gray-400">
              No spending data yet. Add your first expense!
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <div className="space-y-3">
            {data?.recent_activity?.slice(0, 6).map((a, i) => (
              <div key={i} className="flex items-center gap-3">
                <span className="text-xl">💳</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{a.title}</p>
                  <p className="text-gray-400 text-xs truncate">{a.subtitle}</p>
                </div>
                {a.amount && (
                  <span className="text-sm font-semibold shrink-0">{formatCurrency(a.amount)}</span>
                )}
              </div>
            ))}
            {!data?.recent_activity?.length && (
              <p className="text-gray-400 text-sm">No recent activity</p>
            )}
          </div>
        </div>
      </div>

      {/* Top Groups */}
      {data?.top_groups && data.top_groups.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Your Groups</h2>
            <Link href="/groups" className="text-brand-600 text-sm font-medium hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {data.top_groups.map((g) => (
              <Link
                key={g.id}
                href={`/groups/${g.id}`}
                className="flex flex-col items-center p-4 rounded-xl bg-gray-50 hover:bg-brand-50 transition-colors"
              >
                <span className="text-3xl mb-2">{g.image_url || "👥"}</span>
                <span className="font-medium text-sm text-center truncate w-full text-center">{g.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, bg, icon }: { label: string; value: string; color: string; bg: string; icon: string }) {
  return (
    <div className={`${bg} rounded-2xl p-5`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-500 text-sm">{label}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-pulse">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 bg-gray-200 rounded-lg w-56" />
        <div className="h-4 bg-gray-100 rounded w-44" />
      </div>
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-gray-100 rounded-2xl p-5 space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3 bg-gray-200 rounded w-24" />
              <div className="w-6 h-6 bg-gray-200 rounded-full" />
            </div>
            <div className="h-7 bg-gray-200 rounded w-28" />
          </div>
        ))}
      </div>
      {/* Chart + Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="h-5 bg-gray-200 rounded w-36" />
          <div className="flex items-end gap-2 h-40">
            {[60, 80, 45, 90, 55, 70].map((h, i) => (
              <div key={i} className="flex-1 bg-gray-100 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
          <div className="h-5 bg-gray-200 rounded w-28" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-7 h-7 bg-gray-100 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-200 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/2" />
              </div>
              <div className="h-4 bg-gray-200 rounded w-14 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
