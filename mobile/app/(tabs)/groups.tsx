import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Alert, TextInput } from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { groupsApi } from "@/lib/api";
import { Group } from "@/types/index";
import { useState } from "react";

const GROUP_ICONS: Record<string, string> = {
  trip: "✈️", flatmate: "🏠", project: "💼", event: "🎉",
  wedding: "💍", office: "🏢", family: "👨‍👩‍👧", custom: "⭐",
};

function formatCurrency(amount: number, currency = "USD") {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(amount);
}

export default function GroupsScreen() {
  const router = useRouter();
  const qc = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [creating, setCreating] = useState(false);

  const { data: groups = [], isLoading } = useQuery<Group[]>({
    queryKey: ["groups"],
    queryFn: groupsApi.list,
  });

  const handleCreate = async () => {
    if (!groupName.trim()) return;
    setCreating(true);
    try {
      await groupsApi.create({ name: groupName, type: "custom" });
      qc.invalidateQueries({ queryKey: ["groups"] });
      setShowCreate(false);
      setGroupName("");
    } catch {
      Alert.alert("Error", "Failed to create group");
    } finally {
      setCreating(false);
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) return;
    try {
      await groupsApi.join(inviteCode.trim());
      qc.invalidateQueries({ queryKey: ["groups"] });
      setShowJoin(false);
      setInviteCode("");
    } catch {
      Alert.alert("Error", "Invalid invite code");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.toolbar}>
        <TouchableOpacity style={styles.toolbarBtn} onPress={() => setShowJoin(true)}>
          <Text style={styles.toolbarBtnText}>Join</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.toolbarBtn, styles.primaryBtn]} onPress={() => setShowCreate(true)}>
          <Text style={[styles.toolbarBtnText, styles.primaryBtnText]}>+ New</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color="#16a34a" />
      ) : (
        <FlatList
          data={groups}
          keyExtractor={(g) => g.id}
          contentContainerStyle={{ padding: 16 }}
          renderItem={({ item: g }) => (
            <TouchableOpacity style={styles.groupCard} onPress={() => router.push(`/group/${g.id}`)}>
              <Text style={styles.groupIcon}>{GROUP_ICONS[g.type] || "⭐"}</Text>
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.groupMeta}>{g.member_count} members · {g.type}</Text>
              </View>
              <View style={styles.groupBalance}>
                <Text style={[styles.balanceAmount, { color: g.my_balance >= 0 ? "#16a34a" : "#ef4444" }]}>
                  {g.my_balance >= 0 ? "+" : ""}{formatCurrency(g.my_balance, g.currency)}
                </Text>
                <Text style={styles.balanceLabel}>your balance</Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No groups yet</Text>
              <Text style={styles.emptyText}>Create one to start tracking expenses</Text>
            </View>
          }
        />
      )}

      {/* Create Modal */}
      {showCreate && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput style={styles.modalInput} placeholder="Group name" value={groupName} onChangeText={setGroupName} autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreate(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleCreate} disabled={creating}>
                <Text style={styles.confirmBtnText}>{creating ? "Creating..." : "Create"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Join Modal */}
      {showJoin && (
        <View style={styles.overlay}>
          <View style={styles.modal}>
            <Text style={styles.modalTitle}>Join Group</Text>
            <TextInput style={styles.modalInput} placeholder="Invite code" value={inviteCode} onChangeText={setInviteCode} autoCapitalize="none" autoFocus />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowJoin(false)}><Text>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={styles.confirmBtn} onPress={handleJoin}>
                <Text style={styles.confirmBtnText}>Join</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9fafb" },
  toolbar: { flexDirection: "row", gap: 8, padding: 16, justifyContent: "flex-end" },
  toolbarBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5, borderColor: "#d1d5db" },
  toolbarBtnText: { fontWeight: "600", color: "#374151" },
  primaryBtn: { backgroundColor: "#16a34a", borderColor: "#16a34a" },
  primaryBtnText: { color: "#fff" },
  groupCard: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 10, gap: 12 },
  groupIcon: { fontSize: 32 },
  groupInfo: { flex: 1 },
  groupName: { fontWeight: "700", fontSize: 16 },
  groupMeta: { color: "#9ca3af", fontSize: 13, marginTop: 2, textTransform: "capitalize" },
  groupBalance: { alignItems: "flex-end" },
  balanceAmount: { fontWeight: "800", fontSize: 16 },
  balanceLabel: { color: "#9ca3af", fontSize: 11 },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "700", marginBottom: 4 },
  emptyText: { color: "#9ca3af" },
  overlay: { position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", padding: 24 },
  modal: { backgroundColor: "#fff", borderRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: "700", marginBottom: 16 },
  modalInput: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 16, marginBottom: 16 },
  modalActions: { flexDirection: "row", gap: 12 },
  cancelBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#f3f4f6" },
  confirmBtn: { flex: 1, padding: 12, borderRadius: 10, alignItems: "center", backgroundColor: "#16a34a" },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});
