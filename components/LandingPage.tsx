"use client";

import { useRef, useState } from "react";
import type { ComponentType, MouseEvent } from "react";
import Image from "next/image";
import { motion, useInView } from "framer-motion";
import { ArrowRight, Bus, ShieldCheck, Sparkles, Users2, Wifi } from "lucide-react";

const features = [
  {
    title: "Live Bus Positions",
    description: "Track every campus shuttle in real-time with route-level precision.",
    icon: Bus,
  },
  {
    title: "Smart ETA Alerts",
    description: "Get timely notifications before your bus arrives at your stop.",
    icon: Wifi,
  },
  {
    title: "Role-Based Access",
    description: "One platform for admins, drivers, and students with custom views.",
    icon: ShieldCheck,
  },
  {
    title: "Student Friendly UI",
    description: "Fast, responsive interface that works smoothly on mobile and desktop.",
    icon: Users2,
  },
];

const wordVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: "easeOut" as const },
  },
};

const headlineContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.18 } },
};

function BusIllustration() {
  return (
    <svg
      viewBox="0 0 520 360"
      className="w-full max-w-xl drop-shadow-[0_28px_60px_rgba(245,158,11,0.25)]"
    >
      <defs>
        <linearGradient id="busBody" x1="0%" x2="100%" y1="0%" y2="100%">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="busShine" x1="0%" x2="100%" y1="0%" y2="0%">
          <stop offset="0%" stopColor="rgba(255,255,255,0)" />
          <stop offset="50%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>
      <ellipse
        cx="260"
        cy="312"
        rx="180"
        ry="28"
        fill="#1e3a8a"
        opacity="0.22"
      />
      <line
        x1="168"
        y1="232"
        x2="168"
        y2="252"
        stroke="#fcd34d"
        strokeWidth="4"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <line
        x1="362"
        y1="232"
        x2="362"
        y2="252"
        stroke="#fcd34d"
        strokeWidth="4"
        strokeLinecap="round"
        strokeOpacity="0.7"
      />
      <rect x="150" y="224" width="230" height="10" rx="5" fill="#92400e" opacity="0.55" />
      <path
        d="M84 106c0-20 16-36 36-36h228c44 0 92 36 92 84v86c0 24-20 44-44 44H118c-19 0-34-15-34-34z"
        fill="url(#busBody)"
      />
      <rect x="122" y="104" width="242" height="88" rx="16" fill="#fde68a" opacity="0.92" />
      <rect x="376" y="125" width="42" height="67" rx="10" fill="#fcd34d" />
      <g>
        <circle cx="168" cy="286" r="34" fill="#0f172a" />
        <circle cx="168" cy="286" r="15" fill="#f59e0b" />
        <path d="M168 252v68M134 286h68" stroke="#fcd34d" strokeWidth="2.2" strokeOpacity="0.45" />
      </g>
      <g>
        <circle cx="362" cy="286" r="34" fill="#0f172a" />
        <circle cx="362" cy="286" r="15" fill="#f59e0b" />
        <path d="M362 252v68M328 286h68" stroke="#fcd34d" strokeWidth="2.2" strokeOpacity="0.45" />
      </g>
      <rect x="120" y="219" width="276" height="20" rx="8" fill="#b45309" opacity="0.78" />
      <path d="M110 162h302" stroke="#e2e8f0" strokeWidth="5" strokeLinecap="round" opacity="0.7" />
      <rect
        x="70"
        y="80"
        width="110"
        height="190"
        fill="url(#busShine)"
        opacity="0.65"
      />
    </svg>
  );
}

function HeroHeadline() {
  const headline = "Your Campus, Connected.";
  const words = headline.split(" ");
  return (
    <motion.h1
      variants={headlineContainer}
      initial="hidden"
      animate="visible"
      className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-6xl"
      aria-label={headline}
    >
      {words.map((word) => (
        <motion.span key={word} variants={wordVariants} className="mr-3 inline-block">
          {word}
        </motion.span>
      ))}
    </motion.h1>
  );
}

function BusPulseMap() {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35, duration: 0.45 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className="mt-8 rounded-2xl border border-amber-300/20 bg-white/5 p-4 backdrop-blur"
    >
      <div className="mb-2 flex items-center justify-between text-xs font-semibold uppercase tracking-[0.14em] text-amber-100">
        <span>Live Preview</span>
        <span className="inline-flex items-center gap-1 text-[10px] tracking-[0.2em] text-amber-300">
          <span className="h-2 w-2 rounded-full bg-emerald-300" />
          Real Time
        </span>
      </div>
      <div className="relative h-28 overflow-hidden rounded-xl bg-[#0b1323]">
        <svg viewBox="0 0 360 120" className="absolute inset-0 h-full w-full">
          <path
            d="M20 82C88 20 170 96 340 40"
            fill="none"
            stroke="#f59e0b"
            strokeOpacity="0.35"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="7 9"
          />
          <motion.g
            animate={{
              x: [20, 52, 93, 130, 174, 219, 278, 340],
              y: [82, 64, 52, 59, 72, 63, 50, 40],
            }}
            transition={{
              duration: 5.6,
              repeat: Infinity,
              repeatType: "loop",
              ease: "linear",
            }}
          >
            <motion.circle
              r="13"
              fill="#fbbf24"
              opacity="0.32"
              animate={{ scale: [0.7, 1.7, 0.7], opacity: [0.5, 0.08, 0.5] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <circle r="10" fill="#f59e0b" stroke="#fde68a" strokeOpacity="0.65" />
          </motion.g>
        </svg>
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 bg-gradient-to-r from-transparent via-amber-300 to-transparent"
          animate={{ x: ["-20%", "130%"] }}
          transition={{ duration: isHovered ? 1.1 : 1.8, repeat: Infinity, ease: "linear" }}
          style={{ width: "35%" }}
        />
      </div>
    </motion.div>
  );
}

function FeatureCard({
  title,
  description,
  icon: Icon,
  delay,
}: {
  title: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  delay: number;
}) {
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (event: MouseEvent<HTMLElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setGlowPos({ x, y });
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.35 }}
      whileHover={{ scale: 1.05, translateY: -10 }}
      transition={{ duration: 0.45, delay }}
      onMouseMove={handleMouseMove}
      className="relative overflow-hidden rounded-2xl border border-amber-400/20 bg-white/5 p-6 shadow-[0_10px_40px_rgba(15,23,42,0.35)] backdrop-blur"
      style={{
        backgroundImage: `radial-gradient(circle at ${glowPos.x}% ${glowPos.y}%, rgba(245,158,11,0.24) 0%, rgba(245,158,11,0.08) 20%, rgba(15,23,42,0.1) 60%)`,
      }}
    >
      <div className="mb-4 inline-flex rounded-xl bg-[#f59e0b]/20 p-2 text-amber-200">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mb-2 text-lg font-semibold text-white">{title}</h3>
      <p className="text-sm text-slate-300">{description}</p>
    </motion.article>
  );
}

export function LandingPage() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const heroRef = useRef<HTMLElement | null>(null);
  const featuresInView = useInView(sectionRef, { once: true, amount: 0.2 });
  const [heroGlow, setHeroGlow] = useState({ x: 50, y: 50 });
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);

  const handleHeroMouseMove = (event: MouseEvent<HTMLElement>) => {
    const bounds = heroRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = ((event.clientX - bounds.left) / bounds.width) * 100;
    const y = ((event.clientY - bounds.top) / bounds.height) * 100;
    setHeroGlow({ x, y });
    setCursorPos({ x: event.clientX, y: event.clientY });
  };

  return (
    <div
      className="min-h-screen cursor-none bg-[#0b162b] text-slate-100"
      onMouseEnter={() => setShowCursor(true)}
      onMouseLeave={() => setShowCursor(false)}
      onMouseMove={(event) => setCursorPos({ x: event.clientX, y: event.clientY })}
    >
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-[90] hidden md:block"
        animate={{
          x: cursorPos.x - 18,
          y: cursorPos.y - 18,
          opacity: showCursor ? 1 : 0,
          scale: showCursor ? 1 : 0.7,
        }}
        transition={{ type: "spring", stiffness: 420, damping: 28, mass: 0.45 }}
      >
        <div className="relative rounded-full border border-amber-200/70 bg-[#f59e0b] p-2.5 text-white shadow-[0_0_24px_rgba(245,158,11,0.6)]">
          <motion.div
            className="absolute -inset-2 rounded-full border border-amber-300/50"
            animate={{ scale: [0.95, 1.2, 0.95], opacity: [0.8, 0.25, 0.8] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <Bus className="relative h-5 w-5" />
        </div>
      </motion.div>
      <header className="sticky top-0 z-50 border-b border-[#f59e0b]/20 bg-[#0b162b]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
          <div className="relative h-12 w-[70px]">
            <Image src="/LogoBusmate.png" alt="BusMate" fill priority className=" object-left" />
          </div>
          <motion.a
            href="/login"
            animate={{
              boxShadow: [
                "0 0 0 rgba(245,158,11,0.00)",
                "0 0 24px rgba(245,158,11,0.55)",
                "0 0 0 rgba(245,158,11,0.00)",
              ],
            }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            className="group relative inline-flex items-center gap-2 overflow-hidden rounded-xl border border-[#fbbf24]/50 bg-gradient-to-b from-[#fcd34d]/80 via-[#f59e0b]/60 to-[#d97706]/70 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:scale-[1.02]"
          >
            <span className="absolute inset-x-2 top-1 h-1 rounded-full bg-white/80 blur-sm" />
            Sign in
            <ArrowRight className="h-4 w-4" />
          </motion.a>
        </div>
      </header>
      <main>
        <section
          ref={heroRef}
          onMouseMove={handleHeroMouseMove}
          className="mx-auto grid max-w-7xl items-center gap-12 px-4 py-20 md:grid-cols-2 md:px-6"
        >
          <div className="space-y-7">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-[#f59e0b]/35 bg-[#f59e0b]/20 px-4 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-amber-200"
            >
              <Sparkles className="h-3.5 w-3.5" />
              University Bus Tracking
            </motion.div>
            <HeroHeadline />
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="max-w-xl text-base text-slate-200 md:text-lg"
            >
              BusMate helps students ride smarter, drivers stay on route, and campus admins keep transport
              operations synced in real-time.
            </motion.p>
            <BusPulseMap />
          </div>
          <div
            className="relative flex justify-center md:justify-end"
            style={{
              backgroundImage: `radial-gradient(circle at ${heroGlow.x}% ${heroGlow.y}%, rgba(245,158,11,0.22), rgba(11,22,43,0) 45%)`,
            }}
          >
            <div>
              <BusIllustration />
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 pb-12 md:px-6">
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { metric: "99.2%", label: "On-time arrival confidence" },
              { metric: "24/7", label: "Always-on tracking visibility" },
              { metric: "<10s", label: "Live update refresh speed" },
            ].map((item, idx) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ delay: idx * 0.1, duration: 0.45 }}
                whileHover={{ y: -6, boxShadow: "0 20px 40px rgba(245,158,11,0.2)" }}
                className="rounded-2xl border border-amber-300/20 bg-white/5 p-5 backdrop-blur"
              >
                <p className="text-2xl font-extrabold text-white">{item.metric}</p>
                <p className="mt-1 text-sm text-slate-300">{item.label}</p>
              </motion.div>
            ))}
          </div>
        </section>
        <section ref={sectionRef} className="mx-auto max-w-7xl px-4 pb-20 md:px-6">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={featuresInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
            transition={{ duration: 0.45 }}
            className="mb-8 text-2xl font-bold text-white md:text-3xl"
          >
            Built for every campus commuter
          </motion.h2>
          <motion.div
            initial="hidden"
            animate={featuresInView ? "visible" : "hidden"}
            variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.1 } } }}
            className="grid gap-5 md:grid-cols-2"
          >
            {features.map(({ title, description, icon: Icon }, index) => (
              <FeatureCard
                key={title}
                title={title}
                description={description}
                icon={Icon}
                delay={index * 0.1}
              />
            ))}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
