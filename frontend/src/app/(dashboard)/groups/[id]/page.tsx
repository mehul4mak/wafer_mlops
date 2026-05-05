"use client";

import { useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, expensesApi, settlementsApi, tasksApi } from "@/lib/api";
import { GroupDetail, Expense, Settlement, Task, GroupMember } from "@/types";
import { formatCurrency, formatDate, balanceColor, CATEGORY_ICONS, GROUP_TYPE_ICONS, getInitials, cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";
import AddExpenseModal from "@/components/expenses/AddExpenseModal";
import EditExpenseModal from "@/components/expenses/EditExpenseModal";
import SettlementCard from "@/components/settlements/SettlementCard";
import TaskCard from "@/components/tasks/TaskCard";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";
import InviteMemberModal from "@/components/groups/InviteMemberModal";
import EditGroupModal from "@/components/groups/EditGroupModal";

type Tab = "expenses" | "members" | "balances" | "settlements" | "tasks";
type SettlementFilter = "all" | "pending" | "completed";

export default function GroupPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("expenses");
  const [settlementFilter, setSettlementFilter] = useState<SettlementFilter>("all");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showEditGroup, setShowEditGroup] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: group, isLoading: groupLoading } = useQuery<GroupDetail>({
    queryKey: ["group", id],
    queryFn: () => groupsApi.get(id),
  });
  const { data: expenses = [], isLoading: expLoading } = useQuery<Expense[]>({
    queryKey: ["expenses", id],
    queryFn: () => expensesApi.list(id),
    enabled: tab === "expenses",
  });
  const { data: settlements = [], isLoading: settleLoading } = useQuery<Settlement[]>({
    queryKey: ["settlements", id],
    queryFn: () => settlementsApi.list(id),
    enabled: tab === "settlements",
  });
  const { data: debts, isLoading: debtLoading } = useQuery({
    queryKey: ["debts", id],
    queryFn: () => settlementsApi.getDebts(id),
    enabled: tab === "balances",
  });
  const { data: tasks = [], isLoading: taskLoading } = useQuery<Task[]>({
    queryKey: ["tasks", id],
    queryFn: () => tasksApi.list(id),
    enabled: tab === "tasks",
  });

  const settleDebt = useMutation({
    mutationFn: ({ payee_id, amount }: { payee_id: string; amount: number }) =>
      settlementsApi.create({ group_id: id, payee_id, amount }),
    onSuccess: () => {
      toast.success("Settlement recorded!");
      qc.invalidateQueries({ queryKey: ["settlements", id] });
      qc.invalidateQueries({ queryKey: ["debts", id] });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: (expenseId: string) => expensesApi.delete(id, expenseId),
    onSuccess: () => {
      toast.success("Expense deleted");
      qc.invalidateQueries({ queryKey: ["expenses", id] });
      qc.invalidateQueries({ queryKey: ["debts", id] });
    },
    onError: () => toast.error("Failed to delete expense"),
  });

  const removeMember = useMutation({
    mutationFn: (userId: string) => groupsApi.removeMember(id, userId),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["group", id] });
    },
    onError: () => toast.error("Failed to remove member"),
  });

  const leaveGroup = useMutation({
    mutationFn: () => groupsApi.removeMember(id, user!.id),
    onSuccess: () => {
      toast.success("You left the group");
      router.push("/groups");
      qc.invalidateQueries({ queryKey: ["groups"] });
    },
    onError: () => toast.error("Failed to leave group"),
  });

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join?code=${group?.invite_code}`;
    navigator.clipboard.writeText(link);
    toast.success("Invite link copied!");
  };

  if (groupLoading) return <GroupPageSkeleton />;
  if (!group) return null;

  const isOwner = group.owner_id === user?.id;
  const isAdmin = group.members.find((m) => m.user_id === user?.id)?.role !== "member";

  const filteredSettlements = settlements.filter((s) =>
    settlementFilter === "all" ? true : s.status === settlementFilter
  );

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "expenses", label: "Expenses", count: expenses.length || undefined },
    { key: "members", label: "Members", count: group.member_count },
    { key: "balances", label: "Balances" },
    { key: "settlements", label: "Settlements" },
    { key: "tasks", label: "Tasks", count: tasks.filter((t) => t.status !== "completed").length || undefined },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-5">

      {/* ── Group Header ── */}
      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <span className="text-4xl shrink-0">{GROUP_TYPE_ICONS[group.type]}</span>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold truncate">{group.name}</h1>
              {group.description && (
                <p className="text-gray-400 text-sm mt-0.5 truncate">{group.description}</p>
              )}
              <p className="text-gray-500 text-sm mt-1">
                {group.member_count} members · {group.currency} ·{" "}
                <span className="capitalize">{group.type}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Invite link */}
            <button
              onClick={copyInviteLink}
              className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-medium text-gray-600"
              title="Copy invite link"
            >
              <span>🔗</span> Invite
            </button>

            {/* Add expense */}
            <button
              onClick={() => setShowAddExpense(true)}
              className="bg-brand-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-brand-700 text-sm"
            >
              + Expense
            </button>

            {/* Group settings menu */}
            <div className="relative">
              <button
                onClick={() => setShowGroupMenu((v) => !v)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 text-lg leading-none"
              >
                ⋯
              </button>
              {showGroupMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowGroupMenu(false)} />
                  <div className="absolute right-0 top-10 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 min-w-[160px]">
                    {isAdmin && (
                      <button
                        onClick={() => { setShowEditGroup(true); setShowGroupMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        ✏️ Edit group
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => { setShowInvite(true); setShowGroupMenu(false); }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                      >
                        👤 Add member
                      </button>
                    )}
                    <button
                      onClick={() => { copyInviteLink(); setShowGroupMenu(false); }}
                      className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2"
                    >
                      🔗 Copy invite link
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    {!isOwner && (
                      <button
                        onClick={() => { if (confirm("Leave this group?")) { leaveGroup.mutate(); setShowGroupMenu(false); } }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2"
                      >
                        🚪 Leave group
                      </button>
                    )}
                    {isOwner && (
                      <button
                        onClick={() => { if (confirm("Delete this group? This cannot be undone.")) { groupsApi.delete(id).then(() => { router.push("/groups"); qc.invalidateQueries({ queryKey: ["groups"] }); }); setShowGroupMenu(false); } }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2"
                      >
                        🗑️ Delete group
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* My balance pill */}
        <div className="mt-4 flex items-center gap-3">
          <div className={cn(
            "inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold",
            group.my_balance > 0 ? "bg-green-50 text-green-700" :
            group.my_balance < 0 ? "bg-red-50 text-red-600" :
            "bg-gray-50 text-gray-500"
          )}>
            {group.my_balance > 0 ? "💚 You are owed " : group.my_balance < 0 ? "❤️ You owe " : "✅ "}
            {group.my_balance !== 0 && formatCurrency(Math.abs(group.my_balance), group.currency)}
            {group.my_balance === 0 && "All settled up"}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm overflow-x-auto scrollbar-hide">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5",
              tab === t.key ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
            )}
          >
            {t.label}
            {t.count !== undefined && (
              <span className={cn("text-xs px-1.5 py-0.5 rounded-full", tab === t.key ? "bg-white/20" : "bg-gray-100")}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Expenses Tab ── */}
      {tab === "expenses" && (
        <div className="space-y-3">
          {expLoading && <ListSkeleton rows={4} />}
          {!expLoading && expenses.length === 0 && (
            <EmptyState icon="💳" title="No expenses yet" desc="Add the first expense for this group." action={{ label: "+ Add expense", onClick: () => setShowAddExpense(true) }} />
          )}
          {expenses.map((e) => (
            <ExpenseRow
              key={e.id}
              expense={e}
              groupCurrency={group.currency}
              currentUserId={user?.id}
              onEdit={() => setEditingExpense(e)}
              onDelete={() => { if (confirm(`Delete "${e.title}"?`)) deleteExpense.mutate(e.id); }}
              groupId={id}
            />
          ))}
        </div>
      )}

      {/* ── Members Tab ── */}
      {tab === "members" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            {isAdmin && (
              <button
                onClick={() => setShowInvite(true)}
                className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700"
              >
                + Add member
              </button>
            )}
          </div>
          {group.members.map((m) => (
            <MemberRow
              key={m.id}
              member={m}
              isCurrentUser={m.user_id === user?.id}
              canManage={isAdmin && m.user_id !== user?.id && m.role !== "owner"}
              onRemove={() => { if (confirm(`Remove ${m.full_name || m.email}?`)) removeMember.mutate(m.user_id); }}
            />
          ))}
        </div>
      )}

      {/* ── Balances Tab ── */}
      {tab === "balances" && (
        <div className="space-y-3">
          {debtLoading && <ListSkeleton rows={3} />}
          {!debtLoading && !debts?.transactions?.length && (
            <EmptyState icon="✅" title="All settled up!" desc="No outstanding debts in this group." />
          )}
          {debts?.transactions?.map((t: { from_user_id: string; from_user_name: string | null; to_user_name: string | null; to_user_id: string; amount: number; currency: string }, i: number) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-500 font-bold text-sm shrink-0">
                {getInitials(t.from_user_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">
                  <span className="text-red-500 font-semibold">{t.from_user_name || "Someone"}</span>
                  <span className="text-gray-400 mx-1.5">owes</span>
                  <span className="text-green-600 font-semibold">{t.to_user_name || "Someone"}</span>
                </p>
              </div>
              <div className="flex items-center gap-3">
                <p className="font-bold text-lg">{formatCurrency(t.amount, t.currency)}</p>
                {t.from_user_id === user?.id && (
                  <button
                    onClick={() => settleDebt.mutate({ payee_id: t.to_user_id, amount: t.amount })}
                    disabled={settleDebt.isPending}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 font-medium"
                  >
                    Settle up
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Settlements Tab ── */}
      {tab === "settlements" && (
        <div className="space-y-3">
          {/* Filter pills */}
          <div className="flex gap-2">
            {(["all", "pending", "completed"] as SettlementFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setSettlementFilter(f)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors",
                  settlementFilter === f ? "bg-brand-600 text-white" : "bg-white text-gray-600 hover:bg-gray-50 shadow-sm"
                )}
              >
                {f}
              </button>
            ))}
          </div>
          {settleLoading && <ListSkeleton rows={3} />}
          {!settleLoading && filteredSettlements.length === 0 && (
            <EmptyState icon="🤝" title="No settlements" desc={settlementFilter === "all" ? "Settlements will appear here when members settle up." : `No ${settlementFilter} settlements.`} />
          )}
          {filteredSettlements.map((s) => (
            <SettlementCard key={s.id} settlement={s} currentUserId={user?.id} groupId={id} />
          ))}
        </div>
      )}

      {/* ── Tasks Tab ── */}
      {tab === "tasks" && (
        <div className="space-y-3">
          <div className="flex justify-end">
            <button
              onClick={() => setShowCreateTask(true)}
              className="px-4 py-2 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700"
            >
              + New task
            </button>
          </div>
          {taskLoading && <ListSkeleton rows={3} />}
          {!taskLoading && tasks.length === 0 && (
            <EmptyState icon="📋" title="No tasks yet" desc="Create tasks to assign responsibilities to group members." action={{ label: "+ New task", onClick: () => setShowCreateTask(true) }} />
          )}
          {tasks.map((t) => (
            <TaskCard key={t.id} task={t} groupId={id} members={group.members} />
          ))}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddExpense && (
        <AddExpenseModal
          group={group}
          onClose={() => setShowAddExpense(false)}
          onCreated={() => { setShowAddExpense(false); qc.invalidateQueries({ queryKey: ["expenses", id] }); qc.invalidateQueries({ queryKey: ["debts", id] }); }}
        />
      )}
      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          groupId={id}
          onClose={() => setEditingExpense(null)}
          onSaved={() => { setEditingExpense(null); qc.invalidateQueries({ queryKey: ["expenses", id] }); }}
        />
      )}
      {showCreateTask && (
        <CreateTaskModal
          groupId={id}
          members={group.members}
          onClose={() => setShowCreateTask(false)}
          onCreated={() => { setShowCreateTask(false); qc.invalidateQueries({ queryKey: ["tasks", id] }); }}
        />
      )}
      {showInvite && (
        <InviteMemberModal
          groupId={id}
          inviteCode={group.invite_code}
          onClose={() => setShowInvite(false)}
          onInvited={() => { setShowInvite(false); qc.invalidateQueries({ queryKey: ["group", id] }); }}
        />
      )}
      {showEditGroup && (
        <EditGroupModal
          group={group}
          onClose={() => setShowEditGroup(false)}
          onSaved={() => { setShowEditGroup(false); qc.invalidateQueries({ queryKey: ["group", id] }); qc.invalidateQueries({ queryKey: ["groups"] }); }}
        />
      )}
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────

function ExpenseRow({ expense: e, groupCurrency, currentUserId, onEdit, onDelete, groupId }: {
  expense: Expense; groupCurrency: string; currentUserId?: string;
  onEdit: () => void; onDelete: () => void; groupId: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showSplits, setShowSplits] = useState(false);
  const canEdit = e.created_by === currentUserId || e.paid_by === currentUserId;

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 flex items-center gap-4">
        <span className="text-3xl shrink-0">{CATEGORY_ICONS[e.category] || "💳"}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{e.title}</p>
          <p className="text-gray-400 text-sm mt-0.5">
            Paid by <span className="text-gray-600 font-medium">{e.paid_by_name || "Unknown"}</span>
            {" · "}{formatDate(e.date)}
            {" · "}<span className="capitalize">{e.category}</span>
          </p>
          {e.notes && <p className="text-gray-500 text-xs mt-1 italic">"{e.notes}"</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="font-bold text-lg">{formatCurrency(e.amount, e.currency)}</p>
            <p className="text-gray-400 text-xs capitalize">{e.split_type} split</p>
          </div>
          <div className="flex flex-col gap-1">
            <button
              onClick={() => setShowSplits((v) => !v)}
              className="text-xs text-brand-600 hover:underline"
            >
              {showSplits ? "Hide" : "Splits"}
            </button>
            {canEdit && (
              <div className="relative">
                <button onClick={() => setShowMenu((v) => !v)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">⋯</button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 top-6 bg-white border border-gray-100 rounded-xl shadow-lg z-20 py-1 min-w-[130px]">
                      <button onClick={() => { onEdit(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">✏️ Edit</button>
                      {e.receipt_url && (
                        <a href={e.receipt_url} target="_blank" rel="noopener noreferrer" className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 flex items-center gap-2">🧾 Receipt</a>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      <button onClick={() => { onDelete(); setShowMenu(false); }} className="w-full text-left px-4 py-2.5 text-sm hover:bg-red-50 text-red-500 flex items-center gap-2">🗑️ Delete</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSplits && e.splits.length > 0 && (
        <div className="border-t border-gray-50 px-5 py-3 space-y-2 bg-gray-50/50">
          {e.splits.map((s) => (
            <div key={s.id} className="flex items-center gap-2 text-sm">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">
                {getInitials(s.full_name)}
              </div>
              <span className="flex-1 text-gray-600">{s.full_name || "Unknown"}</span>
              <span className="font-medium">{formatCurrency(s.amount, e.currency)}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full", s.is_settled ? "bg-green-100 text-green-600" : "bg-yellow-100 text-yellow-600")}>
                {s.is_settled ? "settled" : "pending"}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MemberRow({ member: m, isCurrentUser, canManage, onRemove }: {
  member: GroupMember; isCurrentUser: boolean; canManage: boolean; onRemove: () => void;
}) {
  const ROLE_STYLES: Record<string, string> = {
    owner: "bg-purple-100 text-purple-700",
    admin: "bg-blue-100 text-blue-700",
    member: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4">
      <div className="w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 font-bold text-sm shrink-0">
        {m.avatar_url ? (
          <img src={m.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
        ) : (
          getInitials(m.full_name)
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-medium truncate">{m.full_name || m.email}</p>
          {isCurrentUser && <span className="text-xs text-gray-400">(you)</span>}
        </div>
        <p className="text-gray-400 text-sm truncate">{m.email}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={cn("text-xs px-2.5 py-1 rounded-full font-medium capitalize", ROLE_STYLES[m.role])}>
          {m.role}
        </span>
        {canManage && (
          <button
            onClick={onRemove}
            className="text-sm text-red-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-lg transition-colors"
          >
            Remove
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon, title, desc, action }: {
  icon: string; title: string; desc: string; action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="text-center py-16 bg-white rounded-2xl shadow-sm">
      <p className="text-5xl mb-3">{icon}</p>
      <h3 className="font-semibold text-lg mb-1">{title}</h3>
      <p className="text-gray-400 text-sm mb-4">{desc}</p>
      {action && (
        <button onClick={action.onClick} className="px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-medium hover:bg-brand-700">
          {action.label}
        </button>
      )}
    </div>
  );
}

function ListSkeleton({ rows }: { rows: number }) {
  return (
    <div className="space-y-3">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-5 shadow-sm animate-pulse flex items-center gap-4">
          <div className="w-10 h-10 bg-gray-200 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-3 bg-gray-100 rounded w-1/2" />
          </div>
          <div className="h-6 bg-gray-200 rounded w-20" />
        </div>
      ))}
    </div>
  );
}

function GroupPageSkeleton() {
  return (
    <div className="max-w-4xl mx-auto space-y-5 animate-pulse">
      <div className="bg-white rounded-2xl p-6 shadow-sm h-40" />
      <div className="bg-white rounded-xl p-1 h-12" />
      <ListSkeleton rows={4} />
    </div>
  );
}
