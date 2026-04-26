"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { expensesApi } from "@/lib/api";
import { GroupDetail } from "@/types";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  amount: z.number({ coerce: true }).positive("Amount must be positive"),
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
});
type FormData = z.infer<typeof schema>;

const CATEGORIES = ["general","food","transport","accommodation","entertainment","utilities","groceries","health","shopping","other"];

export default function AddExpenseModal({ group, onClose, onCreated }: { group: GroupDetail; onClose: () => void; onCreated: () => void }) {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [showTask, setShowTask] = useState(false);

  const { register, handleSubmit, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      split_type: "equal",
      category: "general",
      paid_by: user?.id || "",
      participants: group.members.map((m) => ({ user_id: m.user_id, included: true })),
    },
  });

  const { fields } = useFieldArray({ control, name: "participants" });
  const splitType = watch("split_type");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      const participants = data.participants
        .filter((p) => p.included)
        .map((p) => ({ user_id: p.user_id, amount: p.amount, percentage: p.percentage }));

      await expensesApi.create(group.id, {
        ...data,
        participants,
        task_title: data.task_title || undefined,
        task_assigned_to: data.task_assigned_to || undefined,
        task_due_date: data.task_due_date || undefined,
      });
      toast.success("Expense added!");
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to add expense";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const memberMap = Object.fromEntries(group.members.map((m) => [m.user_id, m.full_name || m.email]));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl my-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Add Expense</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Title *</label>
              <input {...register("title")} placeholder="e.g. Hotel booking" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount *</label>
              <input {...register("amount")} type="number" step="0.01" placeholder="0.00" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date *</label>
              <input {...register("date")} type="date" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Category</label>
              <select {...register("category")} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 capitalize">
                {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Paid by</label>
              <select {...register("paid_by")} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
                {group.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium mb-1">Split Type</label>
              <div className="flex gap-2">
                {["equal", "exact", "percentage"].map((t) => (
                  <label key={t} className="flex-1">
                    <input {...register("split_type")} type="radio" value={t} className="sr-only" />
                    <span className={`block text-center py-2 rounded-lg border-2 text-sm font-medium cursor-pointer transition-colors capitalize ${watch("split_type") === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-gray-200 hover:border-gray-300"}`}>
                      {t}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Participants */}
          {splitType !== "equal" && (
            <div>
              <label className="block text-sm font-medium mb-2">Split Details</label>
              <div className="space-y-2">
                {fields.map((field, i) => (
                  <div key={field.id} className="flex items-center gap-3">
                    <input {...register(`participants.${i}.included`)} type="checkbox" className="rounded" defaultChecked />
                    <span className="flex-1 text-sm">{memberMap[field.user_id] || field.user_id}</span>
                    {splitType === "exact" && (
                      <input {...register(`participants.${i}.amount`)} type="number" step="0.01" placeholder="Amount" className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    )}
                    {splitType === "percentage" && (
                      <input {...register(`participants.${i}.percentage`)} type="number" step="0.1" placeholder="%" className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional Task */}
          <div>
            <button type="button" onClick={() => setShowTask(!showTask)} className="text-sm text-brand-600 font-medium hover:underline">
              {showTask ? "− Remove" : "+ Add"} linked task
            </button>
            {showTask && (
              <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-3">
                <input {...register("task_title")} placeholder="Task title (e.g. Book hotel)" className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                <div className="grid grid-cols-2 gap-2">
                  <select {...register("task_assigned_to")} className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none">
                    <option value="">Assign to...</option>
                    {group.members.map((m) => <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>)}
                  </select>
                  <input {...register("task_due_date")} type="date" className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none" />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Notes</label>
            <textarea {...register("notes")} rows={2} placeholder="Optional notes" className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? "Adding..." : "Add Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
