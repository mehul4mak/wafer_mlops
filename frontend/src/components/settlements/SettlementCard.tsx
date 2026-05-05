"use client";

import { useRef, useState } from "react";
import { Settlement } from "@/types";
import { formatCurrency, formatDate, getInitials, cn } from "@/lib/utils";
import { settlementsApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

const STATUS_ICONS: Record<string, string> = {
  pending: "⏳",
  completed: "✅",
  cancelled: "❌",
};

export default function SettlementCard({
  settlement: s,
  currentUserId,
  groupId,
}: {
  settlement: Settlement;
  currentUserId?: string;
  groupId: string;
}) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [uploadingProof, setUploadingProof] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPayee = s.payee_id === currentUserId;
  const isPayer = s.payer_id === currentUserId;
  const canAct = (isPayee || isPayer) && s.status === "pending";

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await settlementsApi.update(s.id, { status: "completed" });
      toast.success("Payment confirmed!");
      qc.invalidateQueries({ queryKey: ["settlements", groupId] });
      qc.invalidateQueries({ queryKey: ["debts", groupId] });
    } catch {
      toast.error("Failed to confirm");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this settlement?")) return;
    setLoading(true);
    try {
      await settlementsApi.update(s.id, { status: "cancelled" });
      toast.success("Settlement cancelled");
      qc.invalidateQueries({ queryKey: ["settlements", groupId] });
      qc.invalidateQueries({ queryKey: ["debts", groupId] });
    } catch {
      toast.error("Failed to cancel");
    } finally {
      setLoading(false);
    }
  };

  const handleProofUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingProof(true);
    try {
      await settlementsApi.uploadProof(s.id, file);
      toast.success("Proof uploaded!");
      qc.invalidateQueries({ queryKey: ["settlements", groupId] });
    } catch {
      toast.error("Failed to upload proof");
    } finally {
      setUploadingProof(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5">
        {/* Top row */}
        <div className="flex items-start gap-4">
          {/* Avatars */}
          <div className="flex items-center shrink-0">
            <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-xs font-bold">
              {getInitials(s.payer_name)}
            </div>
            <span className="mx-1.5 text-gray-300 text-lg">→</span>
            <div className="w-9 h-9 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-xs font-bold">
              {getInitials(s.payee_name)}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-sm">
                <span className="text-red-500">{s.payer_name || "Someone"}</span>
                <span className="text-gray-400 mx-1">paid</span>
                <span className="text-green-600">{s.payee_name || "Someone"}</span>
              </p>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_STYLES[s.status])}>
                {STATUS_ICONS[s.status]} {s.status}
              </span>
            </div>
            <p className="text-gray-400 text-xs mt-1">
              {formatDate(s.created_at)}
              {s.notes && <span> · "{s.notes}"</span>}
              {s.settled_at && <span> · Confirmed {formatDate(s.settled_at)}</span>}
            </p>
          </div>

          {/* Amount */}
          <p className="font-bold text-xl shrink-0">{formatCurrency(s.amount, s.currency)}</p>
        </div>

        {/* Proof + actions */}
        {(canAct || s.proof_url) && (
          <div className="mt-4 pt-4 border-t border-gray-50 flex items-center gap-2 flex-wrap">
            {/* View / replace proof */}
            {s.proof_url && (
              <a
                href={s.proof_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium"
              >
                🧾 View proof
              </a>
            )}

            {/* Upload proof — payer can upload */}
            {isPayer && s.status === "pending" && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingProof}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 font-medium disabled:opacity-50"
                >
                  {uploadingProof ? "Uploading..." : s.proof_url ? "📷 Replace proof" : "📷 Upload proof"}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  className="hidden"
                  onChange={handleProofUpload}
                />
              </>
            )}

            {/* Payee confirms */}
            {isPayee && s.status === "pending" && (
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex items-center gap-1.5 px-4 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-medium ml-auto"
              >
                ✓ Confirm received
              </button>
            )}

            {/* Payer cancels */}
            {isPayer && s.status === "pending" && (
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-red-200 text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50 font-medium"
              >
                Cancel
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
