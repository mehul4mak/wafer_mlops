"use client";

import { useState } from "react";
import toast from "react-hot-toast";

export default function InviteMemberModal({
  groupId,
  inviteCode,
  onClose,
  onInvited,
}: {
  groupId: string;
  inviteCode: string;
  onClose: () => void;
  onInvited: () => void;
}) {
  const inviteLink = typeof window !== "undefined"
    ? `${window.location.origin}/join?code=${inviteCode}`
    : `https://splitmate.app/join?code=${inviteCode}`;

  const copyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    toast.success("Invite link copied!");
  };

  const copyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast.success("Invite code copied!");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Invite Members</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="space-y-5">
          {/* Invite link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Share invite link</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={inviteLink}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-600 truncate"
              />
              <button
                onClick={copyLink}
                className="px-4 py-3 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700 shrink-0"
              >
                Copy link
              </button>
            </div>
          </div>

          {/* Invite code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Or share the code directly</label>
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <code className="flex-1 text-2xl font-mono font-bold tracking-widest text-gray-800">
                {inviteCode}
              </code>
              <button
                onClick={copyCode}
                className="text-brand-600 text-sm font-medium hover:underline shrink-0"
              >
                Copy code
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Members paste this code on the Groups page → "Join Group"
            </p>
          </div>

          <div className="bg-brand-50 rounded-xl p-4 text-sm text-brand-700">
            <p className="font-medium mb-1">How it works</p>
            <ol className="space-y-1 list-decimal list-inside text-brand-600">
              <li>Share the link or code with your group member</li>
              <li>They open the link or go to Groups → Join Group</li>
              <li>They paste the code and tap "Join"</li>
            </ol>
          </div>

          <button
            onClick={onClose}
            className="w-full py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
