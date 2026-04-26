"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import toast from "react-hot-toast";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { user, fetchProfile } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm({
    defaultValues: {
      full_name: user?.full_name || "",
      phone: user?.phone || "",
      currency: user?.currency || "USD",
    },
  });

  const onSubmit = async (data: { full_name: string; phone: string; currency: string }) => {
    setLoading(true);
    try {
      await authApi.updateMe(data);
      await fetchProfile();
      toast.success("Profile updated!");
    } catch {
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Your Profile</h1>

      <div className="bg-white rounded-2xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center text-brand-700 text-2xl font-bold">
            {user?.avatar_url ? (
              <img src={user.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
            ) : (
              getInitials(user?.full_name)
            )}
          </div>
          <div>
            <p className="font-semibold text-lg">{user?.full_name || "Your Name"}</p>
            <p className="text-gray-400 text-sm">{user?.email}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name</label>
            <input {...register("full_name")} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone</label>
            <input {...register("phone")} placeholder="+1 234 567 8900" className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Default Currency</label>
            <select {...register("currency")} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500">
              {["USD","EUR","GBP","INR","AUD","CAD","SGD","JPY"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <button type="submit" disabled={loading} className="w-full py-3 bg-brand-600 text-white rounded-xl font-medium hover:bg-brand-700 disabled:opacity-50">
            {loading ? "Saving..." : "Save Changes"}
          </button>
        </form>
      </div>
    </div>
  );
}
