"use client";

import { useState, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { expensesApi } from "@/lib/api";
import { GroupDetail } from "@/types";
import { useAuthStore } from "@/store/auth";
import { CATEGORY_ICONS, cn } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  amount: z.number({ coerce: true }).positive("Must be positive"),
  category: z.string().default("general"),
  split_type: z.enum(["equal", "exact", "percentage"]).default("equal"),
  date: z.string(),
  notes: z.string().optional(),
  paid_by: z.string(),
  participants: z.array(z.object({
    user_id: z.string(),
    amount: z.number({ coerce: true }).optional(),
    percentage: z.number({ coerce: true }).optional(),
    included: z.boolean().default(true),
  })),
  task_title: z.string().optional(),
  task_assigned_to: z.string().optional(),
  task_due_date: z.string().optional(),
  task_priority: z.enum(["low", "medium", "high"]).default("medium"),
});
type FormData = z.infer<typeof schema>;

const CATEGORIES = [
  "general","food","transport","accommodation",
  "entertainment","utilities","groceries","health","shopping","other",
];

export default function AddExpenseModal({
  group,
  onClose,
  onCreated,
}: {
  group: GroupDetail;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showTask, setShowTask] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register, handleSubmit, watch, control, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      split_type: "equal",
      category: "general",
      paid_by: user?.id || "",
      task_priority: "medium",
      participants: group.members.map((m) => ({ user_id: m.user_id, included: true })),
    },
  });

  const { fields } = useFieldArray({ control, name: "participants" });
  const splitType = watch("split_type");

  const handleReceiptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFile(file);
    if (file.type.startsWith("image/")) {
      setReceiptPreview(URL.createObjectURL(file));
    } else {
      setReceiptPreview(null);
    }
  };

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const participants = data.participants
        .filter((p) => p.included)
        .map((p) => ({ user_id: p.user_id, amount: p.amount, percentage: p.percentage }));

      const expense = await expensesApi.create(group.id, {
        ...data,
        participants,
        task_title: data.task_title || undefined,
        task_assigned_to: data.task_assigned_to || undefined,
        task_due_date: data.task_due_date || undefined,
        task_priority: data.task_priority || undefined,
      });

      if (receiptFile && expense?.id) {
        try {
          await expensesApi.uploadReceipt(group.id, expense.id, receiptFile);
        } catch {
          toast("Expense saved but receipt upload failed", { icon: "⚠️" });
        }
      }

      toast.success("Expense added!");
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to add expense";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const memberMap = Object.fromEntries(
    group.members.map((m) => [m.user_id, m.full_name || m.email])
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl my-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-xl font-bold">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Title */}
            <div>
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input
                {...register("title")}
                placeholder="e.g. Hotel booking, Dinner, Groceries"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>

            {/* Amount + Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-1">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">{group.currency}</span>
                  <input
                    {...register("amount")}
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
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

            {/* Category */}
            <div>
              <label className="block text-sm font-medium mb-2">Category</label>
              <div className="grid grid-cols-5 gap-2">
                {CATEGORIES.map((c) => (
                  <label key={c} className="cursor-pointer">
                    <input {...register("category")} type="radio" value={c} className="sr-only" />
                    <div className={cn(
                      "flex flex-col items-center p-2 rounded-xl border-2 transition-colors text-center",
                      watch("category") === c ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                    )}>
                      <span className="text-xl">{CATEGORY_ICONS[c] || "💳"}</span>
                      <span className="text-xs mt-1 capitalize leading-tight">{c}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Paid by */}
            <div>
              <label className="block text-sm font-medium mb-1">Paid by</label>
              <select
                {...register("paid_by")}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {group.members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
                ))}
              </select>
            </div>

            {/* Split Type */}
            <div>
              <label className="block text-sm font-medium mb-2">Split type</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { value: "equal", label: "Equal", icon: "⚖️" },
                  { value: "exact", label: "Exact amount", icon: "🔢" },
                  { value: "percentage", label: "Percentage", icon: "%" },
                ].map((t) => (
                  <label key={t.value} className="cursor-pointer">
                    <input {...register("split_type")} type="radio" value={t.value} className="sr-only" />
                    <div className={cn(
                      "flex flex-col items-center p-3 rounded-xl border-2 transition-colors text-center",
                      watch("split_type") === t.value ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:border-gray-200"
                    )}>
                      <span className="text-lg">{t.icon}</span>
                      <span className="text-xs font-medium mt-1">{t.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Participant split details (for exact / percentage) */}
            {splitType !== "equal" && (
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-medium mb-3">
                  {splitType === "exact" ? "Amount per person" : "Percentage per person"}
                </label>
                <div className="space-y-2">
                  {fields.map((field, i) => (
                    <div key={field.id} className="flex items-center gap-3">
                      <input
                        {...register(`participants.${i}.included`)}
                        type="checkbox"
                        className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                        defaultChecked
                      />
                      <span className="flex-1 text-sm font-medium">{memberMap[field.user_id] || field.user_id}</span>
                      {splitType === "exact" && (
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">{group.currency}</span>
                          <input
                            {...register(`participants.${i}.amount`)}
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            className="w-28 pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      )}
                      {splitType === "percentage" && (
                        <div className="relative">
                          <input
                            {...register(`participants.${i}.percentage`)}
                            type="number"
                            step="0.1"
                            max="100"
                            placeholder="0"
                            className="w-20 pr-6 pl-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                          <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">%</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <textarea
                {...register("notes")}
                rows={2}
                placeholder="Add any notes about this expense..."
                className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
              />
            </div>

            {/* Receipt upload */}
            <div>
              <label className="block text-sm font-medium mb-2">Receipt / Proof</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-4 cursor-pointer transition-colors text-center",
                  receiptFile ? "border-brand-400 bg-brand-50" : "border-gray-200 hover:border-brand-300 hover:bg-gray-50"
                )}
              >
                {receiptPreview ? (
                  <div className="flex items-center gap-3">
                    <img src={receiptPreview} alt="Receipt preview" className="w-14 h-14 object-cover rounded-lg" />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-700">{receiptFile?.name}</p>
                      <p className="text-xs text-gray-400">{receiptFile && (receiptFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setReceiptFile(null); setReceiptPreview(null); }}
                      className="text-gray-400 hover:text-red-500 text-lg"
                    >×</button>
                  </div>
                ) : receiptFile ? (
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">📄</span>
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium text-gray-700">{receiptFile.name}</p>
                      <p className="text-xs text-gray-400">{(receiptFile.size / 1024).toFixed(0)} KB</p>
                    </div>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setReceiptFile(null); }} className="text-gray-400 hover:text-red-500 text-lg">×</button>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-1">📷</p>
                    <p className="text-sm text-gray-500">Click to upload receipt or photo</p>
                    <p className="text-xs text-gray-400 mt-1">JPG, PNG, PDF up to 10MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf"
                onChange={handleReceiptChange}
                className="hidden"
              />
            </div>

            {/* Linked task (collapsible) */}
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <button
                type="button"
                onClick={() => setShowTask(!showTask)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <span>📋</span> Link a task to this expense
                </span>
                <span className="text-gray-400">{showTask ? "▲" : "▼"}</span>
              </button>
              {showTask && (
                <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3 bg-gray-50/50">
                  <input
                    {...register("task_title")}
                    placeholder="Task title (e.g. Book hotel, Pay electricity bill)"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      {...register("task_assigned_to")}
                      className="col-span-2 px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="">Assign to...</option>
                      {group.members.map((m) => (
                        <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
                      ))}
                    </select>
                    <select
                      {...register("task_priority")}
                      className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <input
                    {...register("task_due_date")}
                    type="date"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {loading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
