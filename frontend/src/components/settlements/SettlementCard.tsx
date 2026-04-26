"use client";

import { useState } from "react";
import { Settlement } from "@/types";
import { formatCurrency, formatDate } from "@/lib/utils";
import { settlementsApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-700",
  completed: "bg-green-100 text-green-700",
  cancelled: "bg-gray-100 text-gray-500",
};

export default function SettlementCard({ settlement, currentUserId }: { settlement: Settlement; currentUserId?: string }) {
  const qc = useQueryClient();
  const [loading, setLoading] = useState(false);
  const isPayee = settlement.payee_id === currentUserId;
  const isPayer = settlement.payer_id === currentUserId;

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await settlementsApi.update(settlement.id, { status: "completed" });
      toast.success("Settlement confirmed!");
      qc.invalidateQueries({ queryKey: ["settlements"] });
      qc.invalidateQueries({ queryKey: ["debts"] });
    } catch {
      toast.error("Failed to confirm settlement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium">
              {settlement.payer_name} → {settlement.payee_name}
            </span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[settlement.status]}`}>
              {settlement.status}
            </span>
          </div>
          <p className="text-gray-400 text-xs">
            {settlement.notes || "No notes"} · {formatDate(settlement.created_at)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <p className="font-bold text-lg">{formatCurrency(settlement.amount, settlement.currency)}</p>
          {settlement.status === "pending" && isPayee && (
            <button
              onClick={handleConfirm}
              disabled={loading}
              className="text-sm bg-green-600 text-white px-3 py-1.5 rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              Confirm
            </button>
          )}
          {settlement.proof_url && (
            <a href={settlement.proof_url} target="_blank" rel="noopener noreferrer" className="text-sm text-brand-600 hover:underline">
              View proof
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
