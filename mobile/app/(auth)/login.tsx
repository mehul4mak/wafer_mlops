import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth";

export default function LoginScreen() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    if (!email || !password) { Alert.alert("Error", "Please fill in all fields"); return; }
    try {
      await login(email, password);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Login failed";
      Alert.alert("Error", msg);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <View style={styles.header}>
        <Text style={styles.logo}>💰</Text>
        <Text style={styles.appName}>SplitMate</Text>
        <Text style={styles.tagline}>Smarter shared expenses</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email address"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />
        <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleLogin} disabled={isLoading}>
          <Text style={styles.buttonText}>{isLoading ? "Logging in..." : "Log In"}</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <Link href="/(auth)/register" style={styles.link}>Sign up free</Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16a34a", justifyContent: "center", padding: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  logo: { fontSize: 64, marginBottom: 8 },
  appName: { fontSize: 32, fontWeight: "800", color: "#fff" },
  tagline: { fontSize: 16, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  form: { backgroundColor: "#fff", borderRadius: 24, padding: 24, gap: 12 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerText: { color: "#6b7280" },
  link: { color: "#16a34a", fontWeight: "600" },
});
