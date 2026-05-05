"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { tasksApi } from "@/lib/api";
import { GroupMember } from "@/types";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const schema = z.object({
  title: z.string().min(1, "Title required"),
  description: z.string().optional(),
  assigned_to: z.string().optional(),
  due_date: z.string().optional(),
  priority: z.enum(["low", "medium", "high"]).default("medium"),
});
type FormData = z.infer<typeof schema>;

const PRIORITIES = [
  { value: "low", label: "Low", color: "border-blue-300 bg-blue-50 text-blue-700" },
  { value: "medium", label: "Medium", color: "border-yellow-300 bg-yellow-50 text-yellow-700" },
  { value: "high", label: "High", color: "border-red-300 bg-red-50 text-red-700" },
];

export default function CreateTaskModal({
  groupId,
  members,
  onClose,
  onCreated,
}: {
  groupId: string;
  members: GroupMember[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { priority: "medium" },
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    try {
      await tasksApi.create(groupId, {
        ...data,
        assigned_to: data.assigned_to || undefined,
        due_date: data.due_date || undefined,
        description: data.description || undefined,
      });
      toast.success("Task created!");
      onCreated();
    } catch {
      toast.error("Failed to create task");
    } finally {
      setLoading(false);
    }
  };

  const selectedPriority = watch("priority");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold">New Task</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1">Task title *</label>
            <input
              {...register("title")}
              placeholder="e.g. Book hotel, Pay electricity bill"
              autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={2}
              placeholder="Optional details..."
              className="w-full px-4 py-3 border border-gray-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium mb-2">Priority</label>
            <div className="grid grid-cols-3 gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setValue("priority", p.value as "low" | "medium" | "high")}
                  className={cn(
                    "py-2.5 rounded-xl border-2 text-sm font-semibold transition-colors",
                    selectedPriority === p.value ? p.color : "border-gray-100 text-gray-500 hover:border-gray-200"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign to */}
          <div>
            <label className="block text-sm font-medium mb-1">Assign to</label>
            <select
              {...register("assigned_to")}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
              ))}
            </select>
          </div>

          {/* Due date */}
          <div>
            <label className="block text-sm font-medium mb-1">Due date</label>
            <input
              {...register("due_date")}
              type="date"
              min={new Date().toISOString().split("T")[0]}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl font-medium hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 px-4 py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50">
              {loading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
