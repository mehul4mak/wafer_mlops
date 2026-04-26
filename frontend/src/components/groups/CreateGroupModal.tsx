"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { groupsApi } from "@/lib/api";
import { GroupType } from "@/types";
import toast from "react-hot-toast";

const GROUP_TYPES: { value: GroupType; label: string; icon: string }[] = [
  { value: "trip", label: "Trip", icon: "✈️" },
  { value: "flatmate", label: "Flatmates", icon: "🏠" },
  { value: "project", label: "Project", icon: "💼" },
  { value: "event", label: "Event", icon: "🎉" },
  { value: "wedding", label: "Wedding", icon: "💍" },
  { value: "office", label: "Office", icon: "🏢" },
  { value: "family", label: "Family", icon: "👨‍👩‍👧" },
  { value: "custom", label: "Custom", icon: "⭐" },
];

const schema = z.object({
  name: z.string().min(2, "Group name must be at least 2 characters"),
  description: z.string().optional(),
  type: z.enum(["trip", "flatmate", "project", "event", "wedding", "office", "family", "custom"]),
  currency: z.string().default("USD"),
});
type FormData = z.infer<typeof schema>;

export default function CreateGroupModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: "custom", currency: "USD" },
  });
  const selectedType = watch("type");

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await groupsApi.create(data);
      toast.success("Group created!");
      onCreated();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Failed to create group";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">Create New Group</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Group Type</label>
            <div className="grid grid-cols-4 gap-2">
              {GROUP_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setValue("type", t.value)}
                  className={`flex flex-col items-center p-3 rounded-xl border-2 transition-colors ${selectedType === t.value ? "border-brand-500 bg-brand-50" : "border-gray-100 hover:border-gray-300"}`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <span className="text-xs font-medium mt-1">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Group Name *</label>
            <input
              {...register("name")}
              placeholder="e.g. Barcelona Trip 2026"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Optional description"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select {...register("currency")} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
              {["USD", "EUR", "GBP", "INR", "AUD", "CAD", "SGD", "JPY"].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Group"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
