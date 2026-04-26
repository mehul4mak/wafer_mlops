import { View, Text, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useAuthStore } from "@/store/auth";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await logout(); router.replace("/(auth)/login"); } },
    ]);
  };

  const initials = user?.full_name?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "?";

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{user?.full_name || "Your Name"}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        {[
          { label: "Currency", value: user?.currency || "USD" },
          { label: "Phone", value: user?.phone || "Not set" },
        ].map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb", padding: 16 },
  card: { backgroundColor: "#fff", borderRadius: 20, padding: 24, alignItems: "center", marginBottom: 16 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#dcfce7", justifyContent: "center", alignItems: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "800", color: "#16a34a" },
  name: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  email: { color: "#6b7280", fontSize: 14 },
  section: { backgroundColor: "#fff", borderRadius: 16, marginBottom: 16 },
  row: { flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  rowLabel: { color: "#6b7280", fontSize: 15 },
  rowValue: { fontWeight: "600", fontSize: 15 },
  logoutBtn: { backgroundColor: "#fef2f2", borderRadius: 14, padding: 16, alignItems: "center" },
  logoutText: { color: "#ef4444", fontWeight: "700", fontSize: 16 },
});
