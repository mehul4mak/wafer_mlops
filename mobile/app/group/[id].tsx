import { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, Stack } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { groupsApi, expensesApi, settlementsApi, tasksApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

type Tab = "expenses" | "balances" | "tasks";

const CATEGORY_ICONS: Record<string, string> = {
  general: "💳", food: "🍽️", transport: "🚗", accommodation: "🏨",
  entertainment: "🎬", utilities: "⚡", groceries: "🛒", health: "🏥", shopping: "🛍️", other: "📦",
};
const STATUS_ICONS: Record<string, string> = { pending: "⏳", in_progress: "🔄", completed: "✅" };

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function GroupDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("expenses");
  const { user } = useAuthStore();
  const qc = useQueryClient();

  const { data: group } = useQuery({ queryKey: ["group", id], queryFn: () => groupsApi.get(id) });
  const { data: expenses = [], isLoading: expLoading } = useQuery({ queryKey: ["expenses", id], queryFn: () => expensesApi.list(id), enabled: tab === "expenses" });
  const { data: debts, isLoading: debtLoading } = useQuery({ queryKey: ["debts", id], queryFn: () => settlementsApi.getDebts(id), enabled: tab === "balances" });
  const { data: tasks = [], isLoading: taskLoading } = useQuery({ queryKey: ["tasks", id], queryFn: () => tasksApi.list(id), enabled: tab === "tasks" });

  const settleDebt = useMutation({
    mutationFn: ({ payee_id, amount }: { payee_id: string; amount: number }) =>
      settlementsApi.create({ group_id: id, payee_id, amount }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["debts", id] }); Alert.alert("Success", "Settlement recorded!"); },
  });

  const updateTask = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      tasksApi.list(id),  // replace with update in real implementation
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks", id] }),
  });

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: group?.name || "Group", headerShown: true }} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {(["expenses", "balances", "tasks"] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.activeTab]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.activeTabText]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Expenses */}
      {tab === "expenses" && (
        expLoading ? <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" /> :
        <FlatList
          data={expenses}
          keyExtractor={(e: { id: string }) => e.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: e }: { item: { id: string; category: string; title: string; paid_by_name: string | null; date: string; amount: number; currency: string; split_type: string } }) => (
            <View style={styles.expenseCard}>
              <Text style={styles.expIcon}>{CATEGORY_ICONS[e.category] || "💳"}</Text>
              <View style={styles.expInfo}>
                <Text style={styles.expTitle}>{e.title}</Text>
                <Text style={styles.expMeta}>Paid by {e.paid_by_name || "Unknown"}</Text>
                <Text style={styles.expMeta}>{e.date} · {e.split_type}</Text>
              </View>
              <Text style={styles.expAmount}>{formatCurrency(e.amount, e.currency)}</Text>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>💳</Text><Text style={styles.emptyText}>No expenses yet</Text></View>}
        />
      )}

      {/* Balances */}
      {tab === "balances" && (
        debtLoading ? <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" /> :
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {(debts?.transactions || []).length === 0 && (
            <View style={styles.empty}><Text style={styles.emptyIcon}>✅</Text><Text style={styles.emptyText}>All settled up!</Text></View>
          )}
          {(debts?.transactions || []).map((t: { from_user_id: string; from_user_name: string | null; to_user_name: string | null; to_user_id: string; amount: number; currency: string }, i: number) => (
            <View key={i} style={styles.debtCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.debtText}>
                  <Text style={{ color: "#ef4444" }}>{t.from_user_name || "Someone"}</Text>
                  {" owes "}
                  <Text style={{ color: "#16a34a" }}>{t.to_user_name || "Someone"}</Text>
                </Text>
                <Text style={styles.debtAmount}>{formatCurrency(t.amount, t.currency)}</Text>
              </View>
              {t.from_user_id === user?.id && (
                <TouchableOpacity style={styles.settleBtn} onPress={() => settleDebt.mutate({ payee_id: t.to_user_id, amount: t.amount })}>
                  <Text style={styles.settleBtnText}>Settle</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Tasks */}
      {tab === "tasks" && (
        taskLoading ? <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" /> :
        <FlatList
          data={tasks}
          keyExtractor={(t: { id: string }) => t.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: t }: { item: { id: string; status: string; is_overdue: boolean; title: string; assigned_to_name: string | null; due_date: string | null; priority: string } }) => (
            <View style={[styles.taskCard, t.is_overdue && t.status !== "completed" && styles.overdueTask]}>
              <Text style={styles.taskStatus}>{STATUS_ICONS[t.status] || "⏳"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, t.status === "completed" && styles.completedTask]}>{t.title}</Text>
                <Text style={styles.taskMeta}>
                  {t.assigned_to_name && `→ ${t.assigned_to_name}`}
                  {t.due_date && ` · Due ${t.due_date}`}
                </Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: t.priority === "high" ? "#fee2e2" : t.priority === "medium" ? "#fef9c3" : "#dbeafe" }]}>
                <Text style={[styles.priorityText, { color: t.priority === "high" ? "#ef4444" : t.priority === "medium" ? "#ca8a04" : "#3b82f6" }]}>{t.priority}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={<View style={styles.empty}><Text style={styles.emptyIcon}>📋</Text><Text style={styles.emptyText}>No tasks yet</Text></View>}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  tabs: { flexDirection: "row", margin: 16, backgroundColor: "#fff", borderRadius: 12, padding: 4, gap: 2 },
  tab: { flex: 1, padding: 10, borderRadius: 10, alignItems: "center" },
  activeTab: { backgroundColor: "#16a34a" },
  tabText: { fontWeight: "600", color: "#6b7280", textTransform: "capitalize" },
  activeTabText: { color: "#fff" },
  expenseCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  expIcon: { fontSize: 28 },
  expInfo: { flex: 1 },
  expTitle: { fontWeight: "700", fontSize: 15 },
  expMeta: { color: "#9ca3af", fontSize: 12 },
  expAmount: { fontWeight: "800", fontSize: 16 },
  debtCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 16, marginBottom: 8, gap: 12 },
  debtText: { fontWeight: "600", fontSize: 14 },
  debtAmount: { fontWeight: "800", fontSize: 18, marginTop: 4 },
  settleBtn: { backgroundColor: "#16a34a", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  settleBtnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  taskCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8, gap: 12 },
  overdueTask: { borderLeftWidth: 3, borderLeftColor: "#ef4444" },
  taskStatus: { fontSize: 24 },
  taskTitle: { fontWeight: "700", fontSize: 14 },
  completedTask: { textDecorationLine: "line-through", color: "#9ca3af" },
  taskMeta: { color: "#9ca3af", fontSize: 12, marginTop: 2 },
  priorityBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 16 },
});
