import { useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList,
  ActivityIndicator, Alert, Modal, TextInput, KeyboardAvoidingView,
  Platform, SafeAreaView, Pressable,
} from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, expensesApi, settlementsApi, tasksApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import toast from "react-hot-toast";

type Tab = "expenses" | "balances" | "tasks";

const CATEGORY_ICONS: Record<string, string> = {
  general: "💳", food: "🍽️", transport: "🚗", accommodation: "🏨",
  entertainment: "🎬", utilities: "⚡", groceries: "🛒", health: "🏥",
  shopping: "🛍️", other: "📦",
};
const CATEGORIES = Object.keys(CATEGORY_ICONS);
const SPLIT_TYPES = ["equal", "exact", "percentage"] as const;
const STATUS_ICONS: Record<string, string> = { pending: "⏳", in_progress: "🔄", completed: "✅" };

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

// ─── Add Expense Modal ────────────────────────────────────────────────────────
function AddExpenseModal({
  visible, groupId, groupCurrency, members, onClose, onCreated,
}: {
  visible: boolean;
  groupId: string;
  groupCurrency: string;
  members: Array<{ user_id: string; full_name: string | null; email: string }>;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("general");
  const [splitType, setSplitType] = useState<typeof SPLIT_TYPES[number]>("equal");
  const [paidBy, setPaidBy] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const reset = () => {
    setTitle(""); setAmount(""); setCategory("general");
    setSplitType("equal"); setPaidBy(""); setNotes("");
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async () => {
    if (!title.trim()) { Alert.alert("Required", "Please enter a title"); return; }
    const parsed = parseFloat(amount);
    if (!parsed || parsed <= 0) { Alert.alert("Required", "Enter a valid amount"); return; }

    setLoading(true);
    try {
      await expensesApi.create(groupId, {
        title: title.trim(),
        amount: parsed,
        currency: groupCurrency,
        category,
        split_type: splitType,
        paid_by: paidBy || user?.id,
        notes: notes.trim() || undefined,
        date: new Date().toISOString().split("T")[0],
        splits: [],
      });
      reset();
      onCreated();
    } catch {
      Alert.alert("Error", "Failed to create expense");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={handleClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={m.sheet} keyboardShouldPersistTaps="handled">
            {/* Header */}
            <View style={m.sheetHeader}>
              <Text style={m.sheetTitle}>New Expense</Text>
              <TouchableOpacity onPress={handleClose} style={m.closeBtn}>
                <Text style={m.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Title */}
            <View style={m.field}>
              <Text style={m.label}>Title *</Text>
              <TextInput
                style={m.input}
                value={title}
                onChangeText={setTitle}
                placeholder="e.g. Dinner, Hotel, Groceries"
                placeholderTextColor="#9ca3af"
                autoFocus
              />
            </View>

            {/* Amount */}
            <View style={m.field}>
              <Text style={m.label}>Amount *</Text>
              <View style={m.amountRow}>
                <View style={m.currencyPill}>
                  <Text style={m.currencyText}>{groupCurrency}</Text>
                </View>
                <TextInput
                  style={[m.input, { flex: 1, marginBottom: 0 }]}
                  value={amount}
                  onChangeText={setAmount}
                  placeholder="0.00"
                  placeholderTextColor="#9ca3af"
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Category */}
            <View style={m.field}>
              <Text style={m.label}>Category</Text>
              <View style={m.categoryGrid}>
                {CATEGORIES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[m.categoryItem, category === c && m.categoryItemActive]}
                    onPress={() => setCategory(c)}
                  >
                    <Text style={m.categoryIcon}>{CATEGORY_ICONS[c]}</Text>
                    <Text style={[m.categoryName, category === c && m.categoryNameActive]}>
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Split Type */}
            <View style={m.field}>
              <Text style={m.label}>Split Type</Text>
              <View style={m.splitRow}>
                {SPLIT_TYPES.map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={[m.splitBtn, splitType === s && m.splitBtnActive]}
                    onPress={() => setSplitType(s)}
                  >
                    <Text style={[m.splitBtnText, splitType === s && m.splitBtnTextActive]}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Paid By */}
            {members.length > 0 && (
              <View style={m.field}>
                <Text style={m.label}>Paid By</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
                  <View style={{ flexDirection: "row", gap: 8, paddingHorizontal: 4 }}>
                    {members.map((mb) => {
                      const selected = paidBy === mb.user_id || (!paidBy && mb.user_id === user?.id);
                      return (
                        <TouchableOpacity
                          key={mb.user_id}
                          style={[m.memberPill, selected && m.memberPillActive]}
                          onPress={() => setPaidBy(mb.user_id)}
                        >
                          <Text style={[m.memberPillText, selected && m.memberPillTextActive]}>
                            {mb.full_name || mb.email}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </View>
            )}

            {/* Notes */}
            <View style={m.field}>
              <Text style={m.label}>Notes</Text>
              <TextInput
                style={[m.input, { height: 72, textAlignVertical: "top" }]}
                value={notes}
                onChangeText={setNotes}
                placeholder="Optional notes..."
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>

            {/* Actions */}
            <View style={m.actions}>
              <TouchableOpacity style={m.cancelBtn} onPress={handleClose}>
                <Text style={m.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[m.submitBtn, loading && { opacity: 0.6 }]} onPress={handleSubmit} disabled={loading}>
                <Text style={m.submitBtnText}>{loading ? "Creating…" : "Create Expense"}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

// ─── Group Detail Screen ──────────────────────────────────────────────────────
export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: group } = useQuery({ queryKey: ["group", id], queryFn: () => groupsApi.get(id) });
  const { data: expenses = [], isLoading: expLoading } = useQuery({
    queryKey: ["expenses", id],
    queryFn: () => expensesApi.list(id),
    enabled: tab === "expenses",
  });
  const { data: debts, isLoading: debtLoading } = useQuery({
    queryKey: ["debts", id],
    queryFn: () => settlementsApi.getDebts(id),
    enabled: tab === "balances",
  });
  const { data: tasks = [], isLoading: taskLoading } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => tasksApi.list(id),
    enabled: tab === "tasks",
  });

  const settleDebt = useMutation({
    mutationFn: ({ payee_id, amount }: { payee_id: string; amount: number }) =>
      settlementsApi.create({ group_id: id, payee_id, amount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["debts", id] });
      Alert.alert("Success", "Settlement recorded!");
    },
  });

  const members: Array<{ user_id: string; full_name: string | null; email: string }> =
    group?.members ?? [];

  return (
    <View style={s.container}>
      <Stack.Screen
        options={{
          title: group?.name || "Group",
          headerShown: true,
          headerRight: () => (
            <TouchableOpacity style={s.addBtn} onPress={() => setShowAddExpense(true)}>
              <Text style={s.addBtnText}>+ Expense</Text>
            </TouchableOpacity>
          ),
        }}
      />

      {/* Balance pill */}
      {group && (
        <View style={[s.balancePill, group.my_balance > 0 ? s.pillGreen : group.my_balance < 0 ? s.pillRed : s.pillGray]}>
          <Text style={[s.balanceText, group.my_balance > 0 ? s.textGreen : group.my_balance < 0 ? s.textRed : s.textGray]}>
            {group.my_balance > 0
              ? `💚 You are owed ${formatCurrency(Math.abs(group.my_balance), group.currency)}`
              : group.my_balance < 0
              ? `❤️ You owe ${formatCurrency(Math.abs(group.my_balance), group.currency)}`
              : "✅ All settled up"}
          </Text>
        </View>
      )}

      {/* Tabs */}
      <View style={s.tabs}>
        {(["expenses", "balances", "tasks"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[s.tab, tab === t && s.activeTab]} onPress={() => setTab(t)}>
            <Text style={[s.tabText, tab === t && s.activeTabText]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expenses Tab */}
      {tab === "expenses" && (
        expLoading
          ? <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" />
          : <FlatList
              data={expenses as Array<{ id: string; category: string; title: string; paid_by_name: string | null; date: string; amount: number; currency: string; split_type: string; notes?: string }>}
              keyExtractor={(e) => e.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item: e }) => (
                <View style={s.card}>
                  <Text style={s.expIcon}>{CATEGORY_ICONS[e.category] || "💳"}</Text>
                  <View style={s.expInfo}>
                    <Text style={s.expTitle}>{e.title}</Text>
                    <Text style={s.expMeta}>Paid by {e.paid_by_name || "Unknown"} · {e.date}</Text>
                    {e.notes ? <Text style={s.expNotes}>"{e.notes}"</Text> : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.expAmount}>{formatCurrency(e.amount, e.currency)}</Text>
                    <Text style={s.splitBadge}>{e.split_type}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>💳</Text>
                  <Text style={s.emptyTitle}>No expenses yet</Text>
                  <TouchableOpacity style={s.emptyBtn} onPress={() => setShowAddExpense(true)}>
                    <Text style={s.emptyBtnText}>+ Add expense</Text>
                  </TouchableOpacity>
                </View>
              }
            />
      )}

      {/* Balances Tab */}
      {tab === "balances" && (
        debtLoading
          ? <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" />
          : <ScrollView contentContainerStyle={{ padding: 16, gap: 8 }}>
              {(debts?.transactions || []).length === 0 && (
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>✅</Text>
                  <Text style={s.emptyTitle}>All settled up!</Text>
                  <Text style={s.emptyText}>No outstanding debts in this group.</Text>
                </View>
              )}
              {(debts?.transactions || []).map((t: { from_user_id: string; from_user_name: string | null; to_user_name: string | null; to_user_id: string; amount: number; currency: string }, i: number) => (
                <View key={i} style={s.card}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.debtText}>
                      <Text style={{ color: "#ef4444", fontWeight: "700" }}>{t.from_user_name || "Someone"}</Text>
                      <Text style={{ color: "#6b7280" }}> owes </Text>
                      <Text style={{ color: "#16a34a", fontWeight: "700" }}>{t.to_user_name || "Someone"}</Text>
                    </Text>
                    <Text style={s.debtAmount}>{formatCurrency(t.amount, t.currency)}</Text>
                  </View>
                  {t.from_user_id === user?.id && (
                    <TouchableOpacity
                      style={s.settleBtn}
                      onPress={() => settleDebt.mutate({ payee_id: t.to_user_id, amount: t.amount })}
                    >
                      <Text style={s.settleBtnText}>Settle up</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}
            </ScrollView>
      )}

      {/* Tasks Tab */}
      {tab === "tasks" && (
        taskLoading
          ? <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" />
          : <FlatList
              data={tasks as Array<{ id: string; status: string; is_overdue: boolean; title: string; assigned_to_name: string | null; due_date: string | null; priority: string; description?: string }>}
              keyExtractor={(t) => t.id}
              contentContainerStyle={{ padding: 16, gap: 8 }}
              renderItem={({ item: t }) => (
                <View style={[s.card, t.is_overdue && t.status !== "completed" && s.overdueCard]}>
                  <Text style={s.taskStatus}>{STATUS_ICONS[t.status] || "⏳"}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.taskTitle, t.status === "completed" && s.completedTask]}>{t.title}</Text>
                    {t.description ? <Text style={s.taskMeta}>{t.description}</Text> : null}
                    <Text style={s.taskMeta}>
                      {t.assigned_to_name && `→ ${t.assigned_to_name}`}
                      {t.due_date && `  · Due ${t.due_date}`}
                    </Text>
                  </View>
                  <View style={[s.priorityBadge, {
                    backgroundColor: t.priority === "high" ? "#fee2e2" : t.priority === "medium" ? "#fef9c3" : "#dbeafe",
                  }]}>
                    <Text style={[s.priorityText, {
                      color: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#ca8a04" : "#3b82f6",
                    }]}>{t.priority}</Text>
                  </View>
                </View>
              )}
              ListEmptyComponent={
                <View style={s.empty}>
                  <Text style={s.emptyIcon}>📋</Text>
                  <Text style={s.emptyTitle}>No tasks yet</Text>
                  <Text style={s.emptyText}>Tasks are managed from the web app.</Text>
                </View>
              }
            />
      )}

      {/* Add Expense Modal */}
      <AddExpenseModal
        visible={showAddExpense}
        groupId={id}
        groupCurrency={group?.currency || "USD"}
        members={members}
        onClose={() => setShowAddExpense(false)}
        onCreated={() => {
          setShowAddExpense(false);
          qc.invalidateQueries({ queryKey: ["expenses", id] });
          qc.invalidateQueries({ queryKey: ["debts", id] });
        }}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  addBtn: { backgroundColor: "#16a34a", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginRight: 4 },
  addBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  balancePill: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14 },
  pillGreen: { backgroundColor: "#f0fdf4" },
  pillRed: { backgroundColor: "#fef2f2" },
  pillGray: { backgroundColor: "#f9fafb" },
  balanceText: { fontWeight: "600", fontSize: 14 },
  textGreen: { color: "#15803d" },
  textRed: { color: "#dc2626" },
  textGray: { color: "#6b7280" },
  tabs: { flexDirection: "row", marginHorizontal: 16, marginTop: 12, backgroundColor: "#fff", borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  activeTab: { backgroundColor: "#16a34a" },
  tabText: { fontWeight: "600", fontSize: 13, color: "#6b7280", textTransform: "capitalize" },
  activeTabText: { color: "#fff" },
  card: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, gap: 12 },
  overdueCard: { borderLeftWidth: 3, borderLeftColor: "#ef4444" },
  expIcon: { fontSize: 28 },
  expInfo: { flex: 1 },
  expTitle: { fontWeight: "700", fontSize: 15, color: "#111827" },
  expMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  expNotes: { color: "#9ca3af", fontSize: 11, marginTop: 2, fontStyle: "italic" },
  expAmount: { fontWeight: "800", fontSize: 16, color: "#111827" },
  splitBadge: { fontSize: 10, color: "#6b7280", marginTop: 2, textTransform: "capitalize" },
  debtText: { fontSize: 14, fontWeight: "600", color: "#111827" },
  debtAmount: { fontWeight: "800", fontSize: 18, marginTop: 4, color: "#111827" },
  settleBtn: { backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  settleBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  taskStatus: { fontSize: 24 },
  taskTitle: { fontWeight: "700", fontSize: 14, color: "#111827" },
  completedTask: { textDecorationLine: "line-through", color: "#9ca3af" },
  taskMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontWeight: "700", fontSize: 17, color: "#111827", marginBottom: 4 },
  emptyText: { color: "#9ca3af", fontSize: 14 },
  emptyBtn: { marginTop: 16, backgroundColor: "#16a34a", borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10 },
  emptyBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
});

// Modal styles
const m = StyleSheet.create({
  sheet: { padding: 24, paddingBottom: 40 },
  sheetHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  sheetTitle: { fontSize: 22, fontWeight: "800", color: "#111827" },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" },
  closeBtnText: { fontSize: 14, color: "#6b7280", fontWeight: "600" },
  field: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: "#111827",
    backgroundColor: "#fff", marginBottom: 0,
  },
  amountRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  currencyPill: { backgroundColor: "#f3f4f6", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 12, borderWidth: 1.5, borderColor: "#e5e7eb" },
  currencyText: { fontWeight: "700", color: "#374151", fontSize: 14 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  categoryItem: {
    width: "18%", alignItems: "center", paddingVertical: 8, borderRadius: 10,
    borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff",
  },
  categoryItemActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  categoryIcon: { fontSize: 22, marginBottom: 2 },
  categoryName: { fontSize: 9, color: "#6b7280", fontWeight: "500" },
  categoryNameActive: { color: "#15803d", fontWeight: "700" },
  splitRow: { flexDirection: "row", gap: 8 },
  splitBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center",
    borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff",
  },
  splitBtnActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  splitBtnText: { fontWeight: "600", fontSize: 13, color: "#6b7280" },
  splitBtnTextActive: { color: "#15803d" },
  memberPill: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1.5, borderColor: "#e5e7eb", backgroundColor: "#fff",
  },
  memberPillActive: { borderColor: "#16a34a", backgroundColor: "#f0fdf4" },
  memberPillText: { fontWeight: "600", fontSize: 13, color: "#6b7280" },
  memberPillTextActive: { color: "#15803d" },
  actions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1.5, borderColor: "#e5e7eb", alignItems: "center" },
  cancelBtnText: { fontWeight: "600", fontSize: 15, color: "#374151" },
  submitBtn: { flex: 2, paddingVertical: 14, borderRadius: 12, backgroundColor: "#16a34a", alignItems: "center" },
  submitBtnText: { fontWeight: "700", fontSize: 15, color: "#fff" },
});
