"use client";

import { useState } from "react";
import { groupsApi } from "@/lib/api";
import toast from "react-hot-toast";

export default function JoinGroupModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async () => {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await groupsApi.join(code.trim());
      toast.success("Joined group!");
      onJoined();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Invalid invite code";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Join a Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>
        <p className="text-gray-500 text-sm mb-4">Enter the invite code shared by the group owner.</p>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. a1b2c3d4"
          className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 font-mono mb-4"
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
        />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
          <button onClick={handleJoin} disabled={loading || !code.trim()} className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? "Joining..." : "Join Group"}
          </button>
        </div>
      </div>
    </div>
  );
}
