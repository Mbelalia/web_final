"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart2,
  ClipboardCheck,
  Package,
  Shield,
  Zap,
  Play,
  ChevronDown,
  Menu,
  X,
  CheckCircle2,
  Building2,
  Lock,
  TrendingUp,
  Clock,
  AlertTriangle,
  Target,
  Users,
  Calendar,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

/**
 * BIMS – Plateforme SaaS de gestion d'inventaire
 * Landing page optimisée pour les PME françaises (retail, e-commerce, ateliers/entrepôts)
 * Focus sur la conversion et l'adoption entreprise
 */

const FEATURES = [
  {
    icon: Package,
    title: "Suivi temps réel",
    description: "Moins de surprises et d'urgences. Visibilité instantanée sur vos stocks, alertes automatiques.",
    benefit: "Fini les ruptures inattendues",
    color: "from-chart-1 to-chart-2",
    key: "realtime",
  },
  {
    icon: AlertTriangle,
    title: "Alertes & réappro auto",
    description: "Moins de ruptures. Automatisation intelligente des commandes fournisseurs.",
    benefit: "Réduction de 18% des ruptures",
    color: "from-destructive to-chart-3",
    key: "alerts",
  },
  {
    icon: BarChart2,
    title: "Analyses prédictives",
    description: "Commandes plus intelligentes. Prévisions de demande intégrées pour optimiser vos achats.",
    benefit: "Décisions basées sur les données",
    color: "from-chart-4 to-chart-5",
    key: "analytics",
  },
  {
    icon: Users,
    title: "Rôles & permissions",
    description: "Contrôle et traçabilité. Gestion des accès par équipe avec historique complet.",
    benefit: "Sécurité et conformité RGPD",
    color: "from-primary to-accent",
    key: "security",
  },
];

const PAIN_POINTS = [
  {
    icon: AlertTriangle,
    title: "Ruptures de stock",
    description: "Ventes perdues et clients mécontents",
    solution: "Alertes automatiques et seuils intelligents"
  },
  {
    icon: Package,
    title: "Surstocks coûteux",
    description: "Immobilisation de trésorerie",
    solution: "Analyses prédictives pour optimiser les commandes"
  },
  {
    icon: Clock,
    title: "Saisie manuelle lente",
    description: "Erreurs et perte de temps",
    solution: "Interface ultra-simple et intégrations automatiques"
  }
];

const ModernLandingPage = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [active, setActive] = useState(0);

  // Sticky nav detection
  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const id = setInterval(() => setActive((p) => (p + 1) % FEATURES.length), 4000);
    return () => clearInterval(id);
  }, []);

  // Demo datasets
  const dataRealtime = useMemo(
    () =>
      Array.from({ length: 12 }).map((_, i) => ({
        name: `S${i + 1}`,
        stock: Math.round(200 + Math.sin(i / 2) * 40 + i * 5),
        alert: i % 5 === 0 ? 1 : 0,
      })),
    []
  );

  const dataAnalytics = useMemo(
    () =>
      Array.from({ length: 10 }).map((_, i) => ({
        month: ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Août", "Sep", "Oct"][i],
        demande: Math.round(300 + Math.cos(i / 1.5) * 70 + i * 10),
        prev: Math.round(295 + Math.cos(i / 1.6) * 60 + i * 9),
      })),
    []
  );

  const dataOrders = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => ({
        j: `J${i + 1}`,
        approuvees: Math.round(6 + Math.sin(i / 1.2) * 3 + (i % 2 ? 2 : 0)),
        enAttente: Math.round(3 + Math.cos(i / 1.3) * 2 + (i % 3 ? 1 : 0)),
      })),
    []
  );

  // Variants for Framer Motion
  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  };

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* ===== Navbar ===== */}
      <nav
        className={`fixed inset-x-0 top-0 z-50 transition-all ${
          isScrolled
            ? "backdrop-blur-xl bg-background/70 border-b border-border/60 shadow-sm"
            : "bg-transparent"
        }`}
      >
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary" />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-2xl font-extrabold text-transparent">
              BIMS
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-6 md:flex">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground">
              Fonctionnalités
            </a>
            <a href="#pricing" className="text-sm text-muted-foreground hover:text-foreground">
              Tarifs
            </a>
            <Link href="/contact">
              <button className="text-sm text-muted-foreground hover:text-foreground">
                Démo sur demande
              </button>
            </Link>
            <Link href="/login">
              <button className="rounded-full border border-border px-5 py-2 text-sm hover:bg-muted">
                Se connecter
              </button>
            </Link>
            <Link href="/sign-up">
              <button className="rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md transition-transform hover:scale-[1.03]">
                Essai gratuit 14 jours
              </button>
            </Link>
          </div>

          {/* Mobile menu toggle */}
          <button
            aria-label="Ouvrir le menu"
            className="rounded-md p-2 md:hidden hover:bg-muted"
            onClick={() => setMenuOpen((s) => !s)}
          >
            {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile drawer */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-border/60 bg-background/90 backdrop-blur"
            >
              <div className="container mx-auto flex flex-col gap-2 px-6 py-4">
                <a href="#features" className="rounded-md px-2 py-2 hover:bg-muted" onClick={() => setMenuOpen(false)}>
                  Fonctionnalités
                </a>
                <a href="#pricing" className="rounded-md px-2 py-2 hover:bg-muted" onClick={() => setMenuOpen(false)}>
                  Tarifs
                </a>
                <Link href="/contact" onClick={() => setMenuOpen(false)}>
                  <button className="w-full rounded-md px-2 py-2 text-left hover:bg-muted">
                    Démo sur demande
                  </button>
                </Link>
                <div className="mt-2 flex items-center gap-3">
                  <Link href="/login" onClick={() => setMenuOpen(false)} className="flex-1">
                    <button className="w-full rounded-full border border-border px-5 py-2 text-sm hover:bg-muted">
                      Se connecter
                    </button>
                  </Link>
                  <Link href="/sign-up" onClick={() => setMenuOpen(false)} className="flex-1">
                    <button className="w-full rounded-full bg-gradient-to-r from-primary to-secondary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-md">
                      Essai gratuit
                    </button>
                  </Link>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ===== Hero ===== */}
      <section className="relative flex min-h-[92vh] items-center overflow-hidden pt-24">
        {/* gradient blobs */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-secondary/20 blur-3xl" />
          <div className="absolute left-1/2 top-1/2 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/10 blur-3xl" />
        </div>

        <div className="container relative z-10 mx-auto grid items-center gap-12 px-6 md:grid-cols-2">
          {/* left: copy */}
          <motion.div variants={fadeUp} initial="hidden" animate="show" className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Zap className="h-4 w-4" /> Déploiement en 1 jour • UI ultra simple
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight md:text-6xl">
              Suivez, analysez et {""}
              <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                automatisez
              </span>{" "}
              vos stocks en temps réel
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              La plateforme SaaS de gestion d'inventaire pensée pour les PME françaises. 
              Fini les ruptures, les surstocks et la saisie manuelle.
            </p>
            <div className="flex flex-col items-start gap-4 sm:flex-row">
              <Link href="/sign-up">
                <button className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-6 py-3 font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03]">
                  Essai gratuit 14 jours
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </Link>
              <Link href="/contact">
                <button className="flex items-center gap-2 rounded-full border-2 border-border px-6 py-3 font-semibold hover:bg-muted">
                  <Phone className="h-5 w-5" /> Démo sur demande
                </button>
              </Link>
            </div>

            {/* trust points */}
            <div className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-5 w-5 text-primary" /> 200+ entreprises
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <TrendingUp className="h-5 w-5 text-primary" /> -18% ruptures
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-5 w-5 text-primary" /> RGPD & AES-256
              </div>
            </div>
          </motion.div>

          {/* right: live mockup */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            animate="show"
            transition={{ delay: 0.1 }}
            className="relative"
          >
            <div className="relative mx-auto aspect-[4/3] w-full max-w-[640px] overflow-hidden rounded-3xl border border-border/50 bg-card shadow-2xl">
              <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-gradient-to-br from-primary to-secondary" />
                  <span className="text-sm font-semibold">BIMS Dashboard</span>
                </div>
                <div className="flex gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-1" />
                  <span className="h-2.5 w-2.5 rounded-full bg-chart-4" />
                  <span className="h-2.5 w-2.5 rounded-full bg-destructive" />
                </div>
              </div>
              <div className="grid h-full grid-rows-3 gap-4 p-4">
                <div className="row-span-1 grid grid-cols-2 gap-4">
                  <div className="rounded-xl border border-border/50 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">Stock temps réel</p>
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataRealtime} margin={{ top: 5, right: 0, left: -18, bottom: 0 }}>
                          <defs>
                            <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="currentColor" stopOpacity={0.25} />
                              <stop offset="95%" stopColor="currentColor" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" hide />
                          <YAxis hide />
                          <Tooltip formatter={(v) => [`${v}`, "Stock"]} />
                          <Area type="monotone" dataKey="stock" stroke="currentColor" fillOpacity={1} fill="url(#g1)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 p-3">
                    <p className="mb-2 text-xs text-muted-foreground">Réappro automatique</p>
                    <div className="h-24">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataOrders} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                          <XAxis dataKey="j" hide />
                          <YAxis hide />
                          <Tooltip />
                          <Bar dataKey="approuvees" fill="currentColor" radius={4} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
                <div className="row-span-2 rounded-xl border border-border/50 p-4">
                  <div className="mb-1 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Analyses prédictives</p>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">Intégrées</span>
                  </div>
                  <div className="h-[180px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dataAnalytics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="demande" stroke="currentColor" strokeWidth={2} dot={false} />
                        <Line type="monotone" dataKey="prev" stroke="currentColor" strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* scroll indicator */}
        <a href="#pain-points" className="absolute bottom-6 left-1/2 -translate-x-1/2 text-muted-foreground">
          <ChevronDown className="h-6 w-6 animate-bounce" />
        </a>
      </section>

      {/* ===== Pain Points & Solutions ===== */}
      <section id="pain-points" className="border-y border-border/60 bg-card/30 py-16">
        <div className="container mx-auto px-6">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl font-bold mb-4">
              Les défis des <span className="text-primary">PME françaises</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Retail, e-commerce, ateliers et entrepôts : nous comprenons vos problématiques quotidiennes
            </p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {PAIN_POINTS.map((pain, i) => {
              const Icon = pain.icon;
              return (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-2xl border border-border/60 bg-card p-6 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10">
                    <Icon className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{pain.title}</h3>
                  <p className="mb-4 text-sm text-muted-foreground">{pain.description}</p>
                  <div className="rounded-lg bg-primary/10 p-3">
                    <p className="text-sm font-medium text-primary">✓ {pain.solution}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ===== Social Proof ===== */}
      <section className="py-12">
        <div className="container mx-auto px-6">
          <div className="mb-8 text-center text-xs uppercase tracking-widest text-muted-foreground">
            Ils nous font confiance en France
          </div>
          <div className="grid grid-cols-2 items-center gap-8 opacity-80 sm:grid-cols-3 md:grid-cols-6">
            {["Boutique Martin", "TechStock Pro", "Atelier Dubois", "E-Shop Plus", "Entrepôt Loire", "Retail Express"]?.map((n) => (
              <div key={n} className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-border/50 px-3 py-3">
                <Building2 className="h-4 w-4" />
                <span className="text-sm">{n}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== Features with benefits ===== */}
      <section id="features" className="relative py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-muted/40 to-transparent" />
        <div className="container relative z-10 mx-auto grid items-start gap-12 px-6 lg:grid-cols-2">
          <motion.div variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true }}>
            <h2 className="text-4xl font-bold md:text-5xl">
              Pourquoi choisir <span className="text-primary">BIMS</span> ?
            </h2>
            <p className="mt-4 max-w-xl text-lg text-muted-foreground">
              Déploiement en 1 jour, interface ultra-simple, analyses prédictives intégrées. 
              Tout ce qui nous différencie de la concurrence.
            </p>

            <div className="mt-8 space-y-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                const activeCard = i === active;
                return (
                  <button
                    key={f.key}
                    onClick={() => setActive(i)}
                    className={`group flex w-full items-start gap-4 rounded-2xl border p-5 text-left transition-all ${
                      activeCard
                        ? "border-primary/50 bg-card shadow-xl shadow-primary/10"
                        : "border-border/60 bg-card/60 hover:border-primary/30 hover:shadow"
                    }`}
                  >
                    <span
                      className={`rounded-xl bg-gradient-to-r ${f.color} p-3 text-white/90 transition-transform group-hover:scale-105`}
                    >
                      <Icon className="h-6 w-6" />
                    </span>
                    <span className="flex-1">
                      <span className={`block text-lg font-semibold ${activeCard ? "text-primary" : "text-foreground"}`}>
                        {f.title}
                      </span>
                      <span className="mt-1 block text-muted-foreground">{f.description}</span>
                      <span className="mt-2 block text-sm font-medium text-primary">{f.benefit}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          {/* Dynamic preview */}
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {React.createElement(FEATURES[active].icon, { className: "h-5 w-5 text-primary" })}
                  <span className="text-sm font-semibold">{FEATURES[active].title}</span>
                </div>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] uppercase tracking-widest text-muted-foreground">
                  Aperçu
                </span>
              </div>

              <AnimatePresence mode="wait">
                <motion.div
                  key={FEATURES[active].key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3 }}
                >
                  {active === 0 && (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dataRealtime} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <defs>
                            <linearGradient id="rt" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="currentColor" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="currentColor" stopOpacity={0.05} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="stock" stroke="currentColor" fill="url(#rt)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {active === 1 && (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dataAnalytics} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Line type="monotone" dataKey="demande" stroke="currentColor" strokeWidth={2} dot={false} />
                          <Line type="monotone" dataKey="prev" stroke="currentColor" strokeDasharray="4 4" dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {active === 2 && (
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dataOrders} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="j" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="approuvees" radius={6} fill="currentColor" />
                          <Bar dataKey="enAttente" radius={6} fill="currentColor" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  {active === 3 && (
                    <div className="space-y-3">
                      {[
                        "Chiffrement AES-256 au repos",
                        "Chiffrement TLS 1.3 en transit", 
                        "Contrôles d'accès par rôles (RBAC)",
                        "Conformité RGPD complète",
                        "Journalisation et traçabilité",
                      ].map((item) => (
                        <div
                          key={item}
                          className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/40 p-4"
                        >
                          <Shield className="h-5 w-5 text-primary" />
                          <span className="text-sm">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== Integrations ===== */}
      <section className="border-y border-border/60 bg-card/30 py-16">
        <div className="container mx-auto px-6 text-center">
          <motion.div
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
          >
            <h2 className="text-3xl font-bold mb-4">
              Intégrations <span className="text-primary">natives</span>
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Connectez BIMS à vos outils existants en quelques clics
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-2xl mx-auto">
              {["Shopify", "WooCommerce", "CSV/Excel", "API REST"].map((integration) => (
                <div key={integration} className="rounded-xl border border-border/60 bg-card p-4">
                  <div className="h-8 w-8 mx-auto mb-2 rounded bg-gradient-to-br from-primary to-secondary" />
                  <span className="text-sm font-medium">{integration}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== CTA Section ===== */}
      <section className="relative overflow-hidden py-24">
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-primary via-secondary to-accent opacity-10" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_60%_at_50%_0%,hsl(var(--primary)/0.25),transparent)]" />
        <div className="container mx-auto px-6 text-center">
          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="text-4xl font-extrabold md:text-5xl"
          >
            Prêt à transformer votre {""}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              gestion d'inventaire ?
            </span>
          </motion.h2>
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground"
          >
            Rejoignez les 200+ entreprises françaises qui ont déjà réduit leurs ruptures de 18% avec BIMS. 
            Déploiement en 1 jour, essai gratuit 14 jours.
          </motion.p>
          <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link href="/sign-up">
              <button className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary px-8 py-4 text-lg font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.03]">
                Commencer l'essai gratuit
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
              </button>
            </Link>
            <Link href="/contact">
              <button className="rounded-full border-2 border-primary/40 px-8 py-4 text-lg font-semibold hover:bg-primary/10">
                Demander une démo
              </button>
            </Link>
          </div>
          
          {/* Trust indicators */}
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-5 w-5 text-primary" />
              <span>Déploiement en 1 jour</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Shield className="h-5 w-5 text-primary" />
              <span>Sécurité RGPD garantie</span>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Target className="h-5 w-5 text-primary" />
              <span>Support français dédié</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== Footer ===== */}
      <footer className="border-t border-border/60 bg-card/30 py-16 backdrop-blur">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-secondary" />
                <h3 className="text-2xl font-extrabold">BIMS</h3>
              </div>
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                Plateforme SaaS de gestion d'inventaire pour les PME françaises. 
                Suivez, analysez et automatisez vos stocks en temps réel.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Produit</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-primary">Fonctionnalités</a></li>
                <li><a href="#pricing" className="hover:text-primary">Tarifs</a></li>
                <li><a href="/integrations" className="hover:text-primary">Intégrations</a></li>
                <li><a href="/security" className="hover:text-primary">Sécurité</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Entreprise</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="/about" className="hover:text-primary">À propos</a></li>
                <li><a href="/contact" className="hover:text-primary">Contact</a></li>
                <li><a href="/blog" className="hover:text-primary">Blog</a></li>
                <li><a href="/careers" className="hover:text-primary">Carrières</a></li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-semibold">Restez informés</h4>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Merci ! Vous êtes inscrit à notre newsletter.");
                }}
                className="flex flex-col gap-3"
              >
                <input
                  type="email"
                  required
                  placeholder="Votre e‑mail professionnel"
                  className="w-full rounded-xl border border-border/60 bg-background px-4 py-3 text-sm outline-none ring-primary/30 placeholder:text-muted-foreground focus:ring-2"
                />
                <button type="submit" className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground">
                  S'abonner
                </button>
              </form>
            </div>
          </div>

          <div className="mt-10 border-t border-border/50 pt-6 text-center text-sm text-muted-foreground">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
              <span>© {new Date().getFullYear()} BIMS. Tous droits réservés.</span>
              <div className="flex gap-6">
                <a href="/privacy" className="hover:text-primary">Confidentialité</a>
                <a href="/terms" className="hover:text-primary">CGU</a>
                <a href="/rgpd" className="hover:text-primary">RGPD</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ModernLandingPage;