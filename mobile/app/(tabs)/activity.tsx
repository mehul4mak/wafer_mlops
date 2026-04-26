import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { formatDistanceToNow } from "date-fns";

const TYPE_ICONS: Record<string, string> = {
  new_expense: "💳", expense_settled: "✅", settlement_request: "💸",
  settlement_completed: "🎉", task_assigned: "📋", task_due: "⚠️",
  group_invite: "👥", balance_reminder: "🔔", payment_proof: "📷",
};

export default function ActivityScreen() {
  const qc = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: notificationsApi.list,
  });

  const markAll = useMutation({
    mutationFn: notificationsApi.markAllRead,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });

  return (
    <View style={styles.container}>
      {notifications.some((n: { is_read: boolean }) => !n.is_read) && (
        <TouchableOpacity style={styles.markAllBtn} onPress={() => markAll.mutate()}>
          <Text style={styles.markAllText}>Mark all as read</Text>
        </TouchableOpacity>
      )}
      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(n: { id: string }) => n.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: n }: { item: { id: string; type: string; is_read: boolean; title: string; message: string; created_at: string } }) => (
            <View style={[styles.notifCard, !n.is_read && styles.unread]}>
              <Text style={styles.notifIcon}>{TYPE_ICONS[n.type] || "🔔"}</Text>
              <View style={styles.notifContent}>
                <Text style={styles.notifTitle}>{n.title}</Text>
                <Text style={styles.notifMessage}>{n.message}</Text>
                <Text style={styles.notifTime}>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</Text>
              </View>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🔔</Text>
              <Text style={styles.emptyText}>No notifications yet</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  markAllBtn: { padding: 12, alignItems: "flex-end", paddingRight: 16 },
  markAllText: { color: "#16a34a", fontWeight: "600", fontSize: 14 },
  notifCard: { flexDirection: "row", gap: 12, backgroundColor: "#fff", borderRadius: 14, padding: 14, marginBottom: 8 },
  unread: { borderLeftWidth: 3, borderLeftColor: "#16a34a" },
  notifIcon: { fontSize: 24, marginTop: 2 },
  notifContent: { flex: 1 },
  notifTitle: { fontWeight: "700", fontSize: 14 },
  notifMessage: { color: "#6b7280", fontSize: 13, marginTop: 2 },
  notifTime: { color: "#9ca3af", fontSize: 12, marginTop: 4 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyText: { color: "#9ca3af", fontSize: 16 },
});
