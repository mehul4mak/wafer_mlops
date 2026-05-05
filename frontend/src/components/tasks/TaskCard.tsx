"use client";

import { useState } from "react";
import { Task, TaskStatus, GroupMember } from "@/types";
import { tasksApi } from "@/lib/api";
import { useQueryClient, useMutation } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { formatDate, cn, getInitials } from "@/lib/utils";

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-blue-50 text-blue-600 border border-blue-200",
  medium: "bg-yellow-50 text-yellow-700 border border-yellow-200",
  high: "bg-red-50 text-red-600 border border-red-200",
};

const STATUS_CONFIG: Record<TaskStatus, { icon: string; label: string; next: TaskStatus }> = {
  pending: { icon: "⏳", label: "Pending", next: "in_progress" },
  in_progress: { icon: "🔄", label: "In progress", next: "completed" },
  completed: { icon: "✅", label: "Done", next: "pending" },
};

export default function TaskCard({
  task,
  groupId,
  members = [],
}: {
  task: Task;
  groupId: string;
  members?: GroupMember[];
}) {
  const qc = useQueryClient();
  const [showEdit, setShowEdit] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [editAssignee, setEditAssignee] = useState(task.assigned_to || "");
  const [editDue, setEditDue] = useState(task.due_date || "");
  const [editPriority, setEditPriority] = useState(task.priority);

  const cycleStatus = useMutation({
    mutationFn: () => tasksApi.update(groupId, task.id, { status: STATUS_CONFIG[task.status].next }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", groupId] }),
    onError: () => toast.error("Failed to update task"),
  });

  const saveEdit = useMutation({
    mutationFn: () => tasksApi.update(groupId, task.id, {
      title: editTitle,
      assigned_to: editAssignee || undefined,
      due_date: editDue || undefined,
      priority: editPriority,
    }),
    onSuccess: () => {
      setShowEdit(false);
      qc.invalidateQueries({ queryKey: ["tasks", groupId] });
      toast.success("Task updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteTask = useMutation({
    mutationFn: () => tasksApi.delete(groupId, task.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tasks", groupId] });
      toast.success("Task deleted");
    },
    onError: () => toast.error("Failed to delete"),
  });

  const isOverdue = task.is_overdue && task.status !== "completed";

  return (
    <div className={cn(
      "bg-white rounded-2xl shadow-sm overflow-hidden transition-all",
      isOverdue ? "border-l-4 border-red-400" : ""
    )}>
      <div className="p-5">
        <div className="flex items-start gap-3">
          {/* Status toggle */}
          <button
            onClick={() => cycleStatus.mutate()}
            disabled={cycleStatus.isPending}
            className="text-2xl hover:scale-110 transition-transform mt-0.5 shrink-0"
            title={`Click to mark as ${STATUS_CONFIG[task.status].next.replace("_", " ")}`}
          >
            {STATUS_CONFIG[task.status].icon}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "font-semibold",
                  task.status === "completed" ? "line-through text-gray-400" : ""
                )}>
                  {task.title}
                </p>

                {task.description && (
                  <p className="text-gray-500 text-sm mt-1">{task.description}</p>
                )}

                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  {/* Priority badge */}
                  <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium capitalize", PRIORITY_STYLES[task.priority])}>
                    {task.priority}
                  </span>

                  {/* Assignee */}
                  {task.assigned_to_name && (
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <span className="w-4 h-4 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold" style={{ fontSize: "8px" }}>
                        {getInitials(task.assigned_to_name)}
                      </span>
                      {task.assigned_to_name}
                    </span>
                  )}

                  {/* Due date */}
                  {task.due_date && (
                    <span className={cn("text-xs", isOverdue ? "text-red-500 font-semibold" : "text-gray-400")}>
                      {isOverdue ? "⚠️ " : "📅 "}Due {formatDate(task.due_date)}
                    </span>
                  )}

                  {/* Linked expense */}
                  {task.expense_title && (
                    <span className="text-xs text-gray-400">📎 {task.expense_title}</span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="relative shrink-0">
                <button
                  onClick={() => setShowEdit(!showEdit)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
                >
                  ⋯
                </button>
                {showEdit && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowEdit(false)} />
                    <div className="absolute right-0 top-8 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 min-w-[130px]">
                      <button
                        onClick={() => { setShowEdit(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        ✏️ Edit task
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => { if (confirm("Delete this task?")) deleteTask.mutate(); setShowEdit(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2"
                      >
                        🗑️ Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Inline edit panel */}
      {showEdit && (
        <div className="border-t border-gray-100 px-5 py-4 bg-gray-50/50 space-y-3">
          <input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            placeholder="Task title"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              value={editAssignee}
              onChange={(e) => setEditAssignee(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>{m.full_name || m.email}</option>
              ))}
            </select>
            <select
              value={editPriority}
              onChange={(e) => setEditPriority(e.target.value as "low" | "medium" | "high")}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <input
            type="date"
            value={editDue}
            onChange={(e) => setEditDue(e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowEdit(false)} className="flex-1 py-2 border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Cancel</button>
            <button
              onClick={() => saveEdit.mutate()}
              disabled={saveEdit.isPending}
              className="flex-1 py-2 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-700 disabled:opacity-50"
            >
              {saveEdit.isPending ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
