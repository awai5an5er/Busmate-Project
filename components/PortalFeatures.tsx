"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  UserCheck,
  MapPin,
  Zap,
  Radio,
  TrendingUp,
  Clock,
  Users,
  Activity,
} from "lucide-react";
import type { ComponentType } from "react";

interface FeatureItem {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const adminFeatures: FeatureItem[] = [
  {
    icon: BarChart3,
    title: "Real-time Fleet Management",
    description:
      "Monitor all buses and drivers on a unified dashboard with live status updates and route tracking.",
  },
  {
    icon: UserCheck,
    title: "Driver Assignment",
    description:
      "Assign drivers to routes efficiently with one-click operations and automatic trip scheduling.",
  },
  {
    icon: TrendingUp,
    title: "Occupancy Analytics",
    description:
      "Track seat availability and passenger trends to optimize fleet utilization and route planning.",
  },
];

const driverFeatures: FeatureItem[] = [
  {
    icon: Zap,
    title: "One-Tap Trip Activation",
    description:
      "Start and end trips instantly with a single tap to automatically notify students and update status.",
  },
  {
    icon: Radio,
    title: "Real-time GPS Sharing",
    description:
      "Stream live location data to the platform enabling students to track buses with precise accuracy.",
  },
  {
    icon: Activity,
    title: "Live Seat Count Updates",
    description:
      "Monitor and update available seats in real-time as passengers board and exit the bus.",
  },
];

const studentFeatures: FeatureItem[] = [
  {
    icon: MapPin,
    title: "Interactive Live Tracking",
    description:
      "View live bus positions on an interactive map with route paths and real-time location updates.",
  },
  {
    icon: Clock,
    title: "Dynamic ETA Calculations",
    description:
      "Get accurate arrival time estimates updated in real-time based on current traffic and driver progress.",
  },
  {
    icon: Users,
    title: "Seat Availability Dashboard",
    description:
      "Check available seats on each route to plan boarding and avoid overcrowded schedules.",
  },
];

interface RoleCardProps {
  role: "Admin" | "Driver" | "Student";
  features: FeatureItem[];
  delay: number;
}

function RoleCard({ role, features, delay }: RoleCardProps) {
  const roleColors = {
    Admin: "from-blue-600 to-blue-700",
    Driver: "from-amber-600 to-amber-700",
    Student: "from-emerald-600 to-emerald-700",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.5, delay }}
      className="flex flex-col gap-4"
    >
      <div
        className={`rounded-2xl bg-gradient-to-br ${roleColors[role]} p-6 text-white shadow-lg`}
      >
        <h3 className="text-xl font-bold">{role} Portal</h3>
        <p className="mt-1 text-sm opacity-90">
          Optimized tools and workflows for {role.toLowerCase()}s
        </p>
      </div>

      <div className="space-y-3">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:shadow-md transition"
            >
              <div className="flex gap-3">
                <div className="mt-1 flex-shrink-0">
                  <Icon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900">
                    {feature.title}
                  </h4>
                  <p className="mt-1 text-xs text-slate-600">
                    {feature.description}
                  </p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export function PortalFeatures() {
  return (
    <section className="space-y-12 py-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h2 className="text-3xl font-bold text-slate-900 md:text-4xl">
          Platform Features by Role
        </h2>
        <p className="mt-3 text-lg text-slate-600">
          BusMate provides role-specific tools designed to meet the unique needs
          of admins, drivers, and students.
        </p>
      </motion.div>

      <div className="grid gap-8 md:grid-cols-3">
        <RoleCard role="Admin" features={adminFeatures} delay={0} />
        <RoleCard role="Driver" features={driverFeatures} delay={0.1} />
        <RoleCard role="Student" features={studentFeatures} delay={0.2} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8"
      >
        <h3 className="text-lg font-bold text-amber-900">
          🚀 Unified Architecture
        </h3>
        <p className="mt-3 text-sm text-amber-800">
          All features are built on a shared real-time backend powered by
          MongoDB, Next.js API routes, Firebase, and WebSocket integration. This
          ensures seamless data synchronization across all three portals while
          maintaining role-based access control and privacy.
        </p>
      </motion.div>
    </section>
  );
}
