"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  CarFront,
  Crown,
  Eye,
  EyeOff,
  GraduationCap,
} from "lucide-react";

const roleOptions = [
  { id: "student", label: "Student", icon: GraduationCap },
  { id: "driver", label: "Driver", icon: CarFront },
  { id: "admin", label: "Admin", icon: Crown },
] as const;

export function SignupPage() {
  const [step, setStep] = useState<"role" | "form">("role");
  const [selectedRole, setSelectedRole] = useState("");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    studentId: "",
    driverId: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          role: selectedRole,
          studentId: selectedRole === "student" ? form.studentId : undefined,
          driverId: selectedRole === "driver" ? form.driverId : undefined,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        token?: string;
        user?: { role?: string };
      };

      if (!response.ok) {
        setError(data.error || "Signup failed. Please try again.");
        setIsLoading(false);
        return;
      }

      if (data.token && typeof window !== "undefined") {
        const { setClientAuthToken } = await import("@/lib/clientAuthToken");
        setClientAuthToken(data.token);
      }

      window.location.assign(`/${data.user?.role}`);
    } catch {
      setError("Signup failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f172a] px-4">
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-2xl border border-blue-400/20 bg-white/5 p-7 shadow-2xl backdrop-blur-md"
      >
        <AnimatePresence mode="wait">
          {step === "role" ? (
            <motion.div
              key="role"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <h1 className="mb-2 text-3xl font-bold text-white">
                Create your account
              </h1>
              <p className="mb-6 text-sm text-slate-300">
                Choose the portal you want to join and continue.
              </p>
              <div className="grid gap-3">
                {roleOptions.map(({ id, label, icon: Icon }) => (
                  <motion.button
                    key={id}
                    type="button"
                    whileHover={{ scale: 1.03, y: -4 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      setSelectedRole(id);
                      setStep("form");
                    }}
                    className="inline-flex items-center justify-between rounded-xl border border-blue-300/20 bg-slate-900/70 px-4 py-3 text-left text-slate-100"
                  >
                    <span className="inline-flex items-center gap-2 font-medium">
                      <motion.span
                        whileHover={{ y: [0, -3, 0] }}
                        transition={{ duration: 0.5, repeat: Infinity }}
                        className="text-blue-300"
                      >
                        <Icon className="h-5 w-5" />
                      </motion.span>
                      {label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-blue-300" />
                  </motion.button>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.form
              key="form"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              onSubmit={handleSubmit}
            >
              <button
                type="button"
                onClick={() => {
                  setStep("role");
                  setError("");
                }}
                className="mb-5 inline-flex items-center gap-1 text-sm text-blue-200"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to roles
              </button>
              <h1 className="mb-2 text-3xl font-bold text-white">
                Sign up for BusMate
              </h1>
              <p className="mb-6 text-sm text-slate-300">
                Register as a{" "}
                <span className="font-semibold text-blue-200">
                  {selectedRole}
                </span>
                .
              </p>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full name"
                  value={form.name}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-slate-100"
                  required
                />
                <input
                  type="email"
                  placeholder="Email"
                  value={form.email}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, email: event.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-slate-100"
                  required
                />
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={form.password}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        password: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/80 py-3 pl-4 pr-12 text-slate-100"
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-slate-200"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden />
                    )}
                  </button>
                </div>
                {selectedRole === "student" ? (
                  <input
                    type="text"
                    placeholder="Student ID"
                    value={form.studentId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        studentId: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-slate-100"
                    required
                  />
                ) : null}
                {selectedRole === "driver" ? (
                  <input
                    type="text"
                    placeholder="Driver ID"
                    value={form.driverId}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        driverId: event.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-slate-100"
                    required
                  />
                ) : null}
              </div>
              {error ? (
                <p className="mt-4 text-sm text-red-300">{error}</p>
              ) : null}
              <button
                type="submit"
                disabled={isLoading}
                className="mt-6 inline-flex w-full items-center justify-center gap-3 rounded-xl bg-[#22c55e] px-4 py-3 font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-80"
              >
                {isLoading ? (
                  <>
                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    Creating account...
                  </>
                ) : (
                  "Sign up"
                )}
              </button>
              <p className="mt-5 text-center text-xs text-slate-400">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-blue-200 underline"
                >
                  Login here
                </Link>
              </p>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
