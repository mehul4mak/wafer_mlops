"use client";

import { Task, TaskStatus } from "@/types";
import { tasksApi } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatDate } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-blue-100 text-blue-600",
  medium: "bg-yellow-100 text-yellow-600",
  high: "bg-red-100 text-red-600",
};

const STATUS_ICONS: Record<TaskStatus, string> = {
  pending: "⏳",
  in_progress: "🔄",
  completed: "✅",
};

export default function TaskCard({ task, groupId }: { task: Task; groupId: string }) {
  const qc = useQueryClient();

  const cycleStatus = async () => {
    const next: Record<TaskStatus, TaskStatus> = {
      pending: "in_progress",
      in_progress: "completed",
      completed: "pending",
    };
    try {
      await tasksApi.update(groupId, task.id, { status: next[task.status] });
      qc.invalidateQueries({ queryKey: ["tasks", groupId] });
    } catch {
      toast.error("Failed to update task");
    }
  };

  return (
    <div className={`bg-white rounded-2xl p-5 shadow-sm ${task.is_overdue && task.status !== "completed" ? "border-l-4 border-red-400" : ""}`}>
      <div className="flex items-center gap-3">
        <button onClick={cycleStatus} className="text-2xl hover:scale-110 transition-transform" title="Click to change status">
          {STATUS_ICONS[task.status]}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={`font-medium ${task.status === "completed" ? "line-through text-gray-400" : ""}`}>{task.title}</p>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${PRIORITY_STYLES[task.priority]}`}>
              {task.priority}
            </span>
            {task.is_overdue && <span className="text-xs text-red-500 font-medium">Overdue</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-gray-400 text-xs">
            {task.assigned_to_name && <span>→ {task.assigned_to_name}</span>}
            {task.due_date && <span>Due {formatDate(task.due_date)}</span>}
            {task.expense_title && <span>📎 {task.expense_title}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
