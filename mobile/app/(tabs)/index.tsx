import { ScrollView, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { dashboardApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { DashboardData } from "@/types/index";

function formatCurrency(amount: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function DashboardScreen() {
  const { user } = useAuthStore();
  const router = useRouter();
  const { data, isLoading } = useQuery<DashboardData>({ queryKey: ["dashboard"], queryFn: dashboardApi.get });

  if (isLoading) return <View style={styles.center}><ActivityIndicator size="large" color="#16a34a" /></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 24 }}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi, {user?.full_name?.split(" ")[0] || "there"} 👋</Text>
        <Text style={styles.subtitle}>Your financial overview</Text>
      </View>

      {/* Balance Cards */}
      <View style={styles.cards}>
        <BalanceCard label="You are owed" value={formatCurrency(data?.total_owed ?? 0)} color="#16a34a" bg="#f0fdf4" />
        <BalanceCard label="You owe" value={formatCurrency(data?.total_owe ?? 0)} color="#ef4444" bg="#fef2f2" />
      </View>
      <View style={styles.cards}>
        <StatCard label="Groups" value={String(data?.active_groups ?? 0)} icon="👥" />
        <StatCard label="Pending Tasks" value={String(data?.pending_tasks ?? 0)} icon="📋" />
      </View>

      {/* Recent Activity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {data?.recent_activity?.slice(0, 5).map((a, i) => (
          <View key={i} style={styles.activityItem}>
            <Text style={styles.activityIcon}>💳</Text>
            <View style={styles.activityInfo}>
              <Text style={styles.activityTitle}>{a.title}</Text>
              <Text style={styles.activitySub}>{a.type}</Text>
            </View>
            {a.amount !== null && (
              <Text style={styles.activityAmount}>{formatCurrency(a.amount)}</Text>
            )}
          </View>
        ))}
        {!data?.recent_activity?.length && (
          <Text style={styles.emptyText}>No recent activity. Add your first expense!</Text>
        )}
      </View>
    </ScrollView>
  );
}

function BalanceCard({ label, value, color, bg }: { label: string; value: string; color: string; bg: string }) {
  return (
    <View style={[styles.balanceCard, { backgroundColor: bg }]}>
      <Text style={styles.balanceLabel}>{label}</Text>
      <Text style={[styles.balanceValue, { color }]}>{value}</Text>
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { backgroundColor: "#16a34a", padding: 24, paddingTop: 48 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#fff" },
  subtitle: { color: "rgba(255,255,255,0.8)", marginTop: 4 },
  cards: { flexDirection: "row", gap: 12, padding: 16, paddingBottom: 0 },
  balanceCard: { flex: 1, borderRadius: 16, padding: 16 },
  balanceLabel: { fontSize: 12, color: "#6b7280", marginBottom: 4 },
  balanceValue: { fontSize: 20, fontWeight: "800" },
  statCard: { flex: 1, backgroundColor: "#fff", borderRadius: 16, padding: 16, alignItems: "center" },
  statIcon: { fontSize: 28, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: "#111827" },
  statLabel: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  section: { margin: 16, backgroundColor: "#fff", borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: "700", marginBottom: 12 },
  activityItem: { flexDirection: "row", alignItems: "center", paddingVertical: 8, gap: 12 },
  activityIcon: { fontSize: 24 },
  activityInfo: { flex: 1 },
  activityTitle: { fontWeight: "600", fontSize: 14 },
  activitySub: { color: "#9ca3af", fontSize: 12, textTransform: "capitalize" },
  activityAmount: { fontWeight: "700", fontSize: 14 },
  emptyText: { color: "#9ca3af", textAlign: "center", paddingVertical: 16 },
});
