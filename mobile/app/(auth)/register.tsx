import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, Alert, ScrollView } from "react-native";
import { Link, useRouter } from "expo-router";
import { useAuthStore } from "@/store/auth";

export default function RegisterScreen() {
  const router = useRouter();
  const { register, isLoading } = useAuthStore();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleRegister = async () => {
    if (!fullName || !email || !password) { Alert.alert("Error", "Please fill in all fields"); return; }
    if (password !== confirmPassword) { Alert.alert("Error", "Passwords don't match"); return; }
    if (password.length < 8) { Alert.alert("Error", "Password must be at least 8 characters"); return; }
    try {
      await register(email, password, fullName);
      router.replace("/(tabs)");
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || "Registration failed";
      Alert.alert("Error", msg);
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.container} contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }}>
        <View style={styles.header}>
          <Text style={styles.logo}>💰</Text>
          <Text style={styles.appName}>SplitMate</Text>
          <Text style={styles.tagline}>Create your account</Text>
        </View>

        <View style={styles.form}>
          {[
            { placeholder: "Full Name", value: fullName, onChange: setFullName },
            { placeholder: "Email address", value: email, onChange: setEmail, keyboard: "email-address" as const, auto: "none" as const },
            { placeholder: "Password (8+ characters)", value: password, onChange: setPassword, secure: true },
            { placeholder: "Confirm Password", value: confirmPassword, onChange: setConfirmPassword, secure: true },
          ].map((f, i) => (
            <TextInput
              key={i}
              style={styles.input}
              placeholder={f.placeholder}
              value={f.value}
              onChangeText={f.onChange}
              keyboardType={f.keyboard}
              autoCapitalize={f.auto}
              secureTextEntry={f.secure}
            />
          ))}

          <TouchableOpacity style={[styles.button, isLoading && styles.buttonDisabled]} onPress={handleRegister} disabled={isLoading}>
            <Text style={styles.buttonText}>{isLoading ? "Creating account..." : "Create Account"}</Text>
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <Link href="/(auth)/login" style={styles.link}>Log in</Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#16a34a" },
  header: { alignItems: "center", marginBottom: 32 },
  logo: { fontSize: 56, marginBottom: 8 },
  appName: { fontSize: 28, fontWeight: "800", color: "#fff" },
  tagline: { fontSize: 15, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  form: { backgroundColor: "#fff", borderRadius: 24, padding: 24, gap: 12 },
  input: { borderWidth: 1.5, borderColor: "#e5e7eb", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16 },
  button: { backgroundColor: "#16a34a", borderRadius: 12, paddingVertical: 16, alignItems: "center", marginTop: 4 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 8 },
  footerText: { color: "#6b7280" },
  link: { color: "#16a34a", fontWeight: "600" },
});
