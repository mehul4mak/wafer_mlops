"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi } from "@/lib/api";
import { Group } from "@/types";
import { formatCurrency, balanceColor, GROUP_TYPE_ICONS } from "@/lib/utils";
import Link from "next/link";
import toast from "react-hot-toast";
import CreateGroupModal from "@/components/groups/CreateGroupModal";
import JoinGroupModal from "@/components/groups/JoinGroupModal";

export default function GroupsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const qc = useQueryClient();

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
  });

  if (isLoading) return (
    <div className="max-w-4xl mx-auto space-y-6 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-7 bg-gray-200 rounded-lg w-36" />
        <div className="flex gap-3">
          <div className="h-10 bg-gray-100 rounded-xl w-28" />
          <div className="h-10 bg-gray-200 rounded-xl w-28" />
        </div>
      </div>
      <div className="grid gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white rounded-2xl p-6 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-200 rounded-full shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 bg-gray-200 rounded w-1/3" />
              <div className="h-3.5 bg-gray-100 rounded w-1/4" />
            </div>
            <div className="text-right space-y-1.5 shrink-0">
              <div className="h-3 bg-gray-100 rounded w-20 ml-auto" />
              <div className="h-5 bg-gray-200 rounded w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Groups</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setShowJoin(true)}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
          >
            Join Group
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 font-medium"
          >
            + New Group
          </button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm">
          <p className="text-5xl mb-4">👥</p>
          <h3 className="text-xl font-semibold mb-2">No groups yet</h3>
          <p className="text-gray-500 mb-6">Create a group for your trip, flat, project, or event.</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700"
          >
            Create Your First Group
          </button>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="bg-white rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex items-center gap-4"
            >
              <div className="text-4xl">{GROUP_TYPE_ICONS[group.type] || "⭐"}</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-lg">{group.name}</h3>
                <p className="text-gray-500 text-sm">
                  {group.member_count} member{group.member_count !== 1 ? "s" : ""} ·{" "}
                  <span className="capitalize">{group.type}</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm text-gray-400">Your balance</p>
                <p className={`text-lg font-bold ${balanceColor(group.my_balance)}`}>
                  {group.my_balance >= 0 ? "+" : ""}{formatCurrency(group.my_balance, group.currency)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); qc.invalidateQueries({ queryKey: ["groups"] }); }} />}
      {showJoin && <JoinGroupModal onClose={() => setShowJoin(false)} onJoined={() => { setShowJoin(false); qc.invalidateQueries({ queryKey: ["groups"] }); }} />}
    </div>
  );
}
