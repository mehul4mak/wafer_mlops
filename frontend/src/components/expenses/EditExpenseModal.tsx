"use client";

import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { expensesApi } from "@/lib/api";
import { Expense } from "@/types";
import { CATEGORY_ICONS, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  title: z.string().min(1),
  amount: z.number({ coerce: true }).positive(),
  category: z.string(),
  date: z.string(),
  notes: z.string().optional(),
});
type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "general","food","transport","accommodation",
  "entertainment","utilities","groceries","health","shopping","other",
];

export default function EditExpenseModal({
  expense,
  groupId,
  onClose,
  onSaved,
}: {
  expense: Expense;
  groupId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [newReceiptFile, setNewReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: expense.title,
      amount: expense.amount,
      category: expense.category,
      date: expense.date,
      notes: expense.notes || "",
    },
  });

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewReceiptFile(file);
    if (file.type.startsWith("image/")) setReceiptPreview(URL.createObjectURL(file));
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await expensesApi.update(groupId, expense.id, data);

      if (newReceiptFile) {
        try {
          await expensesApi.uploadReceipt(groupId, expense.id, newReceiptFile);
        } catch {
          toast("Expense saved but receipt upload failed", { icon: "⚠️" });
        }
      }

      toast.success("Expense updated!");
      onSaved();
    } catch {
      toast.error("Failed to update expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">Edit Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4 max-h-[65vh] overflow-y-auto">
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                {...register("title")}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">Required</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <input
                  {...register("amount")}
                  type="number"
                  step="0.01"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date *</label>
                <input
                  {...register("date")}
                  type="date"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="cursor-pointer">
                    <input {...register("category")} type="radio" value={c} className="sr-only" />
                    <div className={cn(
                      "flex flex-col items-center p-2 rounded-xl border-2 transition-colors",
                      watch("category") === c ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                    )}>
                      <span className="text-xl">{CATEGORY_ICONS[c]}</span>
                      <span className="text-xs mt-1 capitalize">{c}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                {...register("notes")}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            {/* Receipt */}
            <div>
              <label className="block text-sm font-medium mb-2">Receipt</label>
              {expense.receipt_url && !newReceiptFile && (
                <div className="flex items-center gap-3 mb-2 p-3 bg-gray-50 rounded-xl border border-gray-200">
                  <span className="text-2xl">🧾</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">Current receipt attached</p>
                  </div>
                  <a href={expense.receipt_url} target="_blank" rel="noopener noreferrer" className="text-brand-600 text-sm hover:underline">View</a>
                </div>
              )}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center",
                  newReceiptFile ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
                )}
              >
                {receiptPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={receiptPreview} alt="" className="w-14 h-14 object-cover rounded-lg" />
                    <p className="text-sm text-gray-600 flex-1 text-left">{newReceiptFile?.name}</p>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setNewReceiptFile(null); setReceiptPreview(null); }} className="text-gray-400 hover:text-red-500">×</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-xl mb-1">📷</p>
                    <p className="text-sm text-gray-500">{expense.receipt_url ? "Replace receipt" : "Upload receipt"}</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                  </div>
                )}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleReceiptChange} className="hidden" />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
