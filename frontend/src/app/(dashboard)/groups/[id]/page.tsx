"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, expensesApi, settlementsApi, tasksApi } from "@/lib/api";
import { GroupDetail, Expense, Settlement, Task } from "@/types";
import { formatCurrency, formatDate, balanceColor, CATEGORY_ICONS, GROUP_TYPE_ICONS } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import AddExpenseModal from "@/components/expenses/AddExpenseModal";
import SettlementCard from "@/components/settlements/SettlementCard";
import TaskCard from "@/components/tasks/TaskCard";

type Tab = "expenses" | "balances" | "settlements" | "tasks";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: group } = useQuery<GroupDetail>({ queryKey: ["group", id], queryFn: () => groupsApi.get(id) });
  const { data: expenses = [] } = useQuery<Expense[]>({ queryKey: ["expenses", id], queryFn: () => expensesApi.list(id), enabled: tab === "expenses" });
  const { data: settlements = [] } = useQuery<Settlement[]>({ queryKey: ["settlements", id], queryFn: () => settlementsApi.list(id), enabled: tab === "settlements" });
  const { data: debts } = useQuery({ queryKey: ["debts", id], queryFn: () => settlementsApi.getDebts(id), enabled: tab === "balances" });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["tasks", id], queryFn: () => tasksApi.list(id), enabled: tab === "tasks" });

  const settleDebt = useMutation({
    mutationFn: ({ payee_id, amount }: { payee_id: string; amount: number }) =>
      settlementsApi.create({ group_id: id, payee_id, amount }),
    onSuccess: () => { toast.success("Settlement recorded!"); qc.invalidateQueries({ queryKey: ["settlements", id] }); qc.invalidateQueries({ queryKey: ["debts", id] }); },
  });

  if (!group) return <div className="animate-pulse h-96 bg-gray-200 rounded-2xl" />;

  const tabs: { key: Tab; label: string }[] = [
    { key: "expenses", label: "Expenses" },
    { key: "balances", label: "Balances" },
    { key: "settlements", label: "Settlements" },
    { key: "tasks", label: "Tasks" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-4xl">{GROUP_TYPE_ICONS[group.type]}</span>
            <div>
              <h1 className="text-2xl font-bold">{group.name}</h1>
              <p className="text-gray-500 text-sm">
                {group.member_count} members · {group.currency} ·{" "}
                <span className="capitalize">{group.type}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Invite code</p>
              <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">{group.invite_code}</code>
            </div>
            <button
              onClick={() => setShowAddExpense(true)}
              className="bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700"
            >
              + Add Expense
            </button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm w-fit">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t.key ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "expenses" && (
        <div className="space-y-3">
          {expenses.length === 0 && <EmptyState icon="💳" title="No expenses yet" desc="Add the first expense for this group." />}
          {expenses.map((e) => (
            <div key={e.id} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <span className="text-3xl">{CATEGORY_ICONS[e.category] || "💳"}</span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{e.title}</p>
                <p className="text-gray-400 text-sm">
                  Paid by {e.paid_by_name || "Unknown"} · {formatDate(e.date)}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-lg">{formatCurrency(e.amount, e.currency)}</p>
                <p className="text-gray-400 text-xs">{e.split_type} split</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "balances" && (
        <div className="space-y-3">
          {debts?.transactions?.length === 0 && <EmptyState icon="✅" title="All settled up!" desc="No outstanding debts in this group." />}
          {debts?.transactions?.map((t: { from_user_id: string; from_user_name: string | null; to_user_name: string | null; to_user_id: string; amount: number; currency: string }, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <span className="text-2xl">💸</span>
              <div className="flex-1">
                <p className="font-medium">
                  <span className="text-red-500">{t.from_user_name || "Someone"}</span>{" "}
                  owes{" "}
                  <span className="text-green-600">{t.to_user_name || "Someone"}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-lg">{formatCurrency(t.amount, t.currency)}</p>
                {t.from_user_id === user?.id && (
                  <button
                    onClick={() => settleDebt.mutate({ payee_id: t.to_user_id, amount: t.amount })}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
                  >
                    Settle
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "settlements" && (
        <div className="space-y-3">
          {settlements.length === 0 && <EmptyState icon="🤝" title="No settlements" desc="Settlement records will appear here." />}
          {settlements.map((s) => <SettlementCard key={s.id} settlement={s} currentUserId={user?.id} />)}
        </div>
      )}

      {tab === "tasks" && (
        <div className="space-y-3">
          {tasks.length === 0 && <EmptyState icon="📋" title="No tasks" desc="Assign tasks to group members here." />}
          {tasks.map((t) => <TaskCard key={t.id} task={t} groupId={id} />)}
        </div>
      )}

      {showAddExpense && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowAddExpense(false)}
          onCreated={() => { setShowAddExpense(false); qc.invalidateQueries({ queryKey: ["expenses", id] }); qc.invalidateQueries({ queryKey: ["debts", id] }); }}
        />
      )}
    </div>
  );
}

function EmptyState({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
      <p className="text-5xl mb-3">{icon}</p>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}
