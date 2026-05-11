"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

/* ── Constantes ─────────────────────────────────────────────────── */
const COST_PER_1K = 0.01;
const MARKUP = 5;
const FCFA_PER_USD = 600;
const PLAN_PRICE_FCFA: Record<string, number> = {
  starter: 25_000,
  pro: 75_000,
  enterprise: 150_000,
};
const TOPUP_FCFA = 10_000;
const TOPUP_TOKENS = 200_000;

function fmtFcfa(n: number) { return `${n.toLocaleString("fr-FR")} FCFA`; }
function fmtUsd(n: number)  { return `$${n.toFixed(2)}`; }
function fmtBoth(fcfa: number) {
  return `${fmtFcfa(fcfa)} (${fmtUsd(fcfa / FCFA_PER_USD)})`;
}
function fmtTokens(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

/* ── Interfaces ─────────────────────────────────────────────────── */
interface TenantStat {
  id: string; name: string; plan: string; active: boolean;
  monthlyTokenLimit: number; userCount: number;
  tokensThisMonth: number; estimatedCost: number;
  estimatedRevenue: number; amountPaid: number; balance: number;
  pctUsed: number; systemPrompt: string | null;
  // FCFA fields
  planPriceFcfa: number; amountPaidFcfa: number; balanceFcfa: number;
  isPaidThisMonth: boolean; topupFcfa: number; topupTokensThisMonth: number;
}
interface UserRow {
  id: string; email: string; name: string | null; role: string;
  active: boolean; lastActiveAt: string; tenantId: string;
  tenant: { name: string }; messagesThisMonth: number;
}
interface PaymentRow {
  id: string; tenantId: string;
  amountFcfa: number; amount: number; currency: string;
  type: string; tokensAdded: number;
  method: string; reference: string | null; period: string;
  notes: string | null; paidAt: string;
  tenant: { name: string };
}
interface Stats {
  tenants: TenantStat[]; users: UserRow[];
  messagesThisMonth: number; estimatedRevenue: number;
  totalPaid: number; outstanding: number;
  totalPaidFcfa: number; totalBalanceFcfa: number; overdueCount: number;
  period: string;
  dailyChart: { date: string; count: number }[];
  payments: PaymentRow[];
}

/* ── Dashboard ──────────────────────────────────────────────────── */
export default function AdminDashboard({
  isSuperAdmin = false,
  sessionTenantId = "",
}: {
  isSuperAdmin?: boolean;
  sessionTenantId?: string;
}) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"users" | "usage" | "billing">("users");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleUser(id: string) {
    await fetch(`/api/admin/users/${id}/disable`, { method: "POST" });
    await load();
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-aria-stone">Chargement…</div>;
  if (!stats) return <div className="min-h-screen flex items-center justify-center text-red-500">Erreur de chargement.</div>;

  return (
    <div className="min-h-screen bg-aria-sand">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-aria-anthracite">Administration</h1>
          <p className="text-[10px] text-aria-stone font-medium">Powered by Claude · Anthropic</p>
        </div>
        <Link href="/chat" className="text-sm text-aria-indigo hover:underline">← Retour au chat</Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Entreprises" value={stats.tenants.length} />
          <StatCard label="Utilisateurs" value={stats.users.length} />
          <StatCard label="Messages ce mois" value={stats.messagesThisMonth} />
          <StatCard label="Encaissé" value={fmtFcfa(stats.totalPaidFcfa)} color="green" />
          <StatCard
            label="Impayés"
            value={stats.overdueCount > 0 ? `${stats.overdueCount} entreprise${stats.overdueCount > 1 ? "s" : ""}` : "✓ Tout à jour"}
            color={stats.overdueCount > 0 ? "red" : "green"}
          />
        </div>

        {/* Alerte retardataires (superadmin seulement) */}
        {isSuperAdmin && stats.overdueCount > 0 && tab !== "billing" && (
          <div className="bg-aria-ochre/10 border border-aria-ochre/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚠️</span>
              <p className="text-sm font-medium text-aria-anthracite">
                {stats.overdueCount} entreprise{stats.overdueCount > 1 ? "s" : ""} n&apos;ont pas payé pour {stats.period}
              </p>
            </div>
            <button
              onClick={() => setTab("billing")}
              className="text-xs bg-aria-terracotta text-white px-3 py-1.5 rounded-lg hover:bg-aria-terracotta-dark"
            >
              Voir facturation →
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(["users", "usage", "billing"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-medium ${tab === t ? "border-b-2 border-aria-indigo text-aria-indigo" : "text-aria-stone hover:text-aria-anthracite"}`}>
                {t === "users" ? "Utilisateurs" : t === "usage" ? "Utilisation" : (
                  <span className="flex items-center gap-1.5">
                    Facturation
                    {isSuperAdmin && stats.overdueCount > 0 && (
                      <span className="bg-aria-terracotta text-white text-xs rounded-full w-4 h-4 flex items-center justify-center font-bold">
                        {stats.overdueCount}
                      </span>
                    )}
                  </span>
                )}
              </button>
            ))}
          </div>

          {tab === "users" && <UsersTab users={stats.users} onToggle={toggleUser} isSuperAdmin={isSuperAdmin} sessionTenantId={sessionTenantId} onRefresh={load} />}
          {tab === "usage" && <UsageTab stats={stats} onRefresh={load} isSuperAdmin={isSuperAdmin} />}
          {tab === "billing" && <BillingTab stats={stats} onRefresh={load} isSuperAdmin={isSuperAdmin} />}
        </div>
      </main>
    </div>
  );
}

/* ── Users tab ──────────────────────────────────────────────────── */
function UsersTab({
  users, onToggle, isSuperAdmin, sessionTenantId, onRefresh,
}: {
  users: UserRow[]; onToggle: (id: string) => void;
  isSuperAdmin: boolean; sessionTenantId: string; onRefresh: () => void;
}) {
  const [pwdUserId, setPwdUserId] = useState<string | null>(null);
  const [pwdValue, setPwdValue] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdError, setPwdError] = useState("");

  async function savePassword() {
    if (pwdValue.length < 6) { setPwdError("Minimum 6 caractères"); return; }
    setPwdSaving(true);
    const res = await fetch(`/api/admin/users/${pwdUserId}/password`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pwdValue }),
    });
    setPwdSaving(false);
    if (res.ok) { setPwdUserId(null); setPwdValue(""); setPwdError(""); onRefresh(); }
    else setPwdError(await res.text());
  }

  const visible = isSuperAdmin ? users : users.filter((u) => u.tenantId === sessionTenantId);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-aria-sand text-aria-stone text-xs uppercase">
          <tr>
            <th className="px-4 py-3 text-left">Email</th>
            {isSuperAdmin && <th className="px-4 py-3 text-left">Entreprise</th>}
            <th className="px-4 py-3 text-left">Rôle</th>
            <th className="px-4 py-3 text-left">Messages/mois</th>
            <th className="px-4 py-3 text-left">Dernière activité</th>
            <th className="px-4 py-3 text-left">Statut</th>
            <th className="px-4 py-3 text-left">Mot de passe</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E8E2D6]">
          {visible.map((u) => (
            <tr key={u.id} className="hover:bg-aria-sand">
              <td className="px-4 py-3 font-medium text-aria-anthracite">{u.email}</td>
              {isSuperAdmin && <td className="px-4 py-3 text-aria-stone">{u.tenant.name}</td>}
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "superadmin" ? "bg-red-100 text-red-700" : u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-aria-sand text-aria-stone"}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 text-aria-stone">{u.messagesThisMonth}</td>
              <td className="px-4 py-3 text-aria-stone">{new Date(u.lastActiveAt).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3">
                <button onClick={() => onToggle(u.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${u.active ? "bg-aria-emerald/10 text-aria-emerald hover:bg-red-100 hover:text-red-700" : "bg-red-100 text-red-700 hover:bg-aria-emerald/10 hover:text-aria-emerald"}`}>
                  {u.active ? "Actif" : "Suspendu"}
                </button>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => { setPwdUserId(u.id); setPwdValue(""); setPwdError(""); }}
                  className="text-xs text-aria-stone hover:text-aria-indigo px-2 py-1 rounded hover:bg-aria-indigo-light"
                >
                  🔑 Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {pwdUserId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-aria-anthracite mb-1">Nouveau mot de passe</h2>
            <p className="text-sm text-aria-stone mb-4">{visible.find((u) => u.id === pwdUserId)?.email}</p>
            <input
              type="password" autoFocus value={pwdValue}
              onChange={(e) => { setPwdValue(e.target.value); setPwdError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") savePassword(); }}
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0 mb-1"
            />
            {pwdError && <p className="text-xs text-red-600 mb-2">{pwdError}</p>}
            <div className="flex gap-3 mt-3">
              <button onClick={() => { setPwdUserId(null); setPwdValue(""); setPwdError(""); }}
                className="flex-1 border border-aria-indigo text-aria-indigo rounded-lg px-4 py-2 text-sm hover:bg-aria-indigo-light">
                Annuler
              </button>
              <button onClick={savePassword} disabled={pwdSaving || !pwdValue}
                className="flex-1 bg-aria-terracotta text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-aria-terracotta-dark disabled:opacity-50">
                {pwdSaving ? "Sauvegarde…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Usage tab ──────────────────────────────────────────────────── */
function UsageTab({ stats, onRefresh, isSuperAdmin }: { stats: Stats; onRefresh: () => void; isSuperAdmin: boolean }) {
  const [configId, setConfigId] = useState<string | null>(null);
  const [configForm, setConfigForm] = useState({ systemPrompt: "", plan: "starter" });
  const [saving, setSaving] = useState(false);

  function openConfig(t: TenantStat) {
    setConfigId(t.id);
    setConfigForm({ systemPrompt: t.systemPrompt ?? "", plan: t.plan });
  }

  async function saveConfig() {
    if (!configId) return;
    setSaving(true);
    await fetch(`/api/admin/tenants/${configId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configForm),
    });
    setSaving(false);
    setConfigId(null);
    onRefresh();
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-aria-stone mb-3">Messages par jour (30 derniers jours)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.dailyChart}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} formatter={(v) => [`${v} messages`, ""]} />
            <Bar dataKey="count" fill="#1A2A4F" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-aria-stone mb-3">Quota & consommation par entreprise</h3>
        <div className="space-y-4">
          {stats.tenants.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-aria-anthracite">{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.pctUsed >= 90 ? "bg-red-100 text-red-700" : t.pctUsed >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {t.pctUsed.toFixed(0)}% utilisé
                  </span>
                  {isSuperAdmin && (
                    <button
                      onClick={() => configId === t.id ? setConfigId(null) : openConfig(t)}
                      className="text-xs text-aria-indigo hover:underline"
                    >
                      {configId === t.id ? "Fermer" : "⚙ Configurer"}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${t.pctUsed >= 90 ? "bg-red-500" : t.pctUsed >= 70 ? "bg-aria-ochre" : "bg-aria-indigo"}`}
                  style={{ width: `${Math.min(t.pctUsed, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-aria-stone">
                <span>{fmtTokens(t.tokensThisMonth)} / {fmtTokens(t.monthlyTokenLimit)} tokens</span>
                <span>Coût API: ${t.estimatedCost.toFixed(3)}</span>
              </div>

              {configId === t.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-aria-stone mb-1">Plan</label>
                      <select
                        value={configForm.plan}
                        onChange={(e) => setConfigForm((f) => ({ ...f, plan: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0"
                      >
                        <option value="starter">starter — {fmtFcfa(25_000)}/mois</option>
                        <option value="pro">pro — {fmtFcfa(75_000)}/mois</option>
                        <option value="enterprise">enterprise — {fmtFcfa(150_000)}/mois</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-aria-stone mb-1">
                      Prompt système personnalisé
                      <span className="ml-1 text-aria-stone font-normal">(laissez vide pour le prompt global)</span>
                    </label>
                    <textarea
                      value={configForm.systemPrompt}
                      onChange={(e) => setConfigForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                      rows={5}
                      placeholder="Ex : Tu es un assistant juridique spécialisé en droit OHADA…"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0 resize-none font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setConfigId(null)} className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">Annuler</button>
                    <button onClick={saveConfig} disabled={saving} className="px-4 py-1.5 text-sm bg-aria-terracotta text-white rounded-lg hover:bg-aria-terracotta-dark disabled:opacity-50">
                      {saving ? "Sauvegarde…" : "Sauvegarder"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Billing tab ────────────────────────────────────────────────── */
function BillingTab({ stats, onRefresh, isSuperAdmin }: { stats: Stats; onRefresh: () => void; isSuperAdmin: boolean }) {
  const [showForm, setShowForm] = useState(false);
  const [editQuota, setEditQuota] = useState<{ id: string; name: string; limit: number } | null>(null);
  const [saving, setSaving] = useState(false);

  const defaultForm = {
    tenantId: "",
    amountFcfa: "",
    type: "subscription" as "subscription" | "topup",
    method: "cash",
    reference: "",
    period: new Date().toISOString().slice(0, 7),
    notes: "",
  };
  const [form, setForm] = useState(defaultForm);

  // Calcul automatique des tokens pour recharge
  const tokensForTopup = form.type === "topup"
    ? Math.floor(Number(form.amountFcfa || 0) / TOPUP_FCFA) * TOPUP_TOKENS
    : 0;

  // Prix suggéré selon plan sélectionné
  const selectedTenant = stats.tenants.find((t) => t.id === form.tenantId);
  const suggestedPrice = selectedTenant ? PLAN_PRICE_FCFA[selectedTenant.plan] ?? 25_000 : null;

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const res = await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        amountFcfa: Number(form.amountFcfa),
      }),
    });
    setSaving(false);
    if (res.ok) {
      setShowForm(false);
      setForm(defaultForm);
      onRefresh();
    }
  }

  async function saveQuota() {
    if (!editQuota) return;
    setSaving(true);
    await fetch(`/api/admin/tenants/${editQuota.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ monthlyTokenLimit: editQuota.limit }),
    });
    setSaving(false);
    setEditQuota(null);
    onRefresh();
  }

  const overdueList = stats.tenants.filter((t) => !t.isPaidThisMonth && t.active);
  const paidList = stats.tenants.filter((t) => t.isPaidThisMonth);

  return (
    <div className="p-4 space-y-6">

      {/* Résumé global */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-center">
          <p className="text-xs text-green-600 mb-1">Encaissé ce mois</p>
          <p className="text-lg font-bold text-green-700">{fmtFcfa(stats.totalPaidFcfa)}</p>
          <p className="text-xs text-green-500">{fmtUsd(stats.totalPaidFcfa / FCFA_PER_USD)}</p>
        </div>
        <div className={`${stats.totalBalanceFcfa > 0 ? "bg-red-50 border-red-200" : "bg-aria-sand border-gray-200"} border rounded-xl px-4 py-3 text-center`}>
          <p className={`text-xs mb-1 ${stats.totalBalanceFcfa > 0 ? "text-red-600" : "text-aria-stone"}`}>Reste à encaisser</p>
          <p className={`text-lg font-bold ${stats.totalBalanceFcfa > 0 ? "text-red-700" : "text-aria-stone"}`}>{fmtFcfa(stats.totalBalanceFcfa)}</p>
          <p className={`text-xs ${stats.totalBalanceFcfa > 0 ? "text-red-500" : "text-aria-stone"}`}>{fmtUsd(stats.totalBalanceFcfa / FCFA_PER_USD)}</p>
        </div>
        <div className={`${stats.overdueCount > 0 ? "bg-aria-ochre/10 border-aria-ochre/30" : "bg-green-50 border-green-200"} border rounded-xl px-4 py-3 text-center`}>
          <p className={`text-xs mb-1 ${stats.overdueCount > 0 ? "text-aria-anthracite" : "text-green-600"}`}>Statut</p>
          <p className={`text-lg font-bold ${stats.overdueCount > 0 ? "text-aria-anthracite" : "text-green-700"}`}>
            {stats.overdueCount > 0 ? `${stats.overdueCount} retard${stats.overdueCount > 1 ? "s" : ""}` : "✅ Tout à jour"}
          </p>
          <p className={`text-xs ${stats.overdueCount > 0 ? "text-aria-stone" : "text-green-500"}`}>
            {paidList.length}/{stats.tenants.length} payées
          </p>
        </div>
      </div>

      {/* Entreprises en retard */}
      {overdueList.length > 0 && (
        <div className="border border-aria-ochre/30 rounded-xl overflow-hidden">
          <div className="bg-aria-ochre/10 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-aria-anthracite">⚠️ Paiements en attente — {stats.period}</h3>
            {isSuperAdmin && (
              <button onClick={() => setShowForm(true)} className="bg-aria-terracotta text-white text-xs px-3 py-1.5 rounded-lg hover:bg-aria-terracotta-dark">
                + Enregistrer un paiement
              </button>
            )}
          </div>
          <div className="divide-y divide-[#E8E2D6]">
            {overdueList.map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between bg-white">
                <div>
                  <p className="text-sm font-medium text-aria-anthracite">{t.name}</p>
                  <p className="text-xs text-aria-stone">
                    Offre {t.plan} · Dû : <strong className="text-aria-terracotta">{fmtBoth(t.balanceFcfa)}</strong>
                    {t.amountPaidFcfa > 0 && <span className="text-green-600 ml-2">(payé {fmtFcfa(t.amountPaidFcfa)} sur {fmtFcfa(t.planPriceFcfa)})</span>}
                  </p>
                </div>
                {isSuperAdmin && (
                  <button
                    onClick={() => {
                      setForm((f) => ({ ...f, tenantId: t.id, amountFcfa: String(t.balanceFcfa), type: "subscription" }));
                      setShowForm(true);
                    }}
                    className="text-xs bg-aria-terracotta text-white px-3 py-1.5 rounded-lg hover:bg-aria-terracotta-dark"
                  >
                    Enregistrer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tableau récapitulatif */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-aria-stone">Toutes les entreprises — {stats.period}</h3>
          {isSuperAdmin && overdueList.length === 0 && (
            <button onClick={() => setShowForm(true)} className="bg-aria-terracotta text-white text-xs px-3 py-1.5 rounded-lg hover:bg-aria-terracotta-dark">
              + Enregistrer un paiement
            </button>
          )}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-aria-sand text-aria-stone text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Entreprise</th>
                <th className="px-4 py-3 text-left">Offre</th>
                <th className="px-4 py-3 text-right">Tarif mensuel</th>
                <th className="px-4 py-3 text-right">Encaissé</th>
                <th className="px-4 py-3 text-right">Recharge</th>
                <th className="px-4 py-3 text-center">Statut</th>
                <th className="px-4 py-3 text-left">Quota tokens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D6]">
              {stats.tenants.map((t) => (
                <tr key={t.id} className={`hover:bg-aria-sand ${!t.isPaidThisMonth && t.active ? "bg-aria-ochre/5" : ""}`}>
                  <td className="px-4 py-3 font-medium text-aria-anthracite">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-aria-indigo/10 text-aria-indigo capitalize">{t.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-aria-anthracite font-medium">{fmtFcfa(t.planPriceFcfa)}</span>
                    <span className="text-aria-stone text-xs block">{fmtUsd(t.planPriceFcfa / FCFA_PER_USD)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="text-green-700 font-medium">{fmtFcfa(t.amountPaidFcfa)}</span>
                    <span className="text-aria-stone text-xs block">{fmtUsd(t.amountPaidFcfa / FCFA_PER_USD)}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {t.topupFcfa > 0 ? (
                      <>
                        <span className="text-aria-indigo font-medium">{fmtFcfa(t.topupFcfa)}</span>
                        <span className="text-aria-stone text-xs block">+{fmtTokens(t.topupTokensThisMonth)} tokens</span>
                      </>
                    ) : <span className="text-aria-stone">—</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {!t.active ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-aria-sand text-aria-stone">Suspendu</span>
                    ) : t.isPaidThisMonth ? (
                      <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-700 font-medium">✅ Payé</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-xs bg-aria-ochre/10 text-aria-anthracite font-medium">⚠️ En attente</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {isSuperAdmin ? (
                      editQuota?.id === t.id ? (
                        <div className="flex items-center gap-1">
                          <input type="number" value={editQuota.limit}
                            onChange={(e) => setEditQuota((q) => q ? { ...q, limit: Number(e.target.value) } : q)}
                            className="w-24 border border-gray-300 rounded px-2 py-0.5 text-xs" />
                          <button onClick={saveQuota} disabled={saving} className="text-xs bg-aria-terracotta text-white px-2 py-0.5 rounded">✓</button>
                          <button onClick={() => setEditQuota(null)} className="text-xs text-aria-stone px-1">✕</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditQuota({ id: t.id, name: t.name, limit: t.monthlyTokenLimit })}
                          className="text-xs text-aria-stone hover:text-aria-indigo underline-offset-2 hover:underline">
                          {fmtTokens(t.monthlyTokenLimit)}
                        </button>
                      )
                    ) : (
                      <span className="text-xs text-aria-stone">{fmtTokens(t.monthlyTokenLimit)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Historique des paiements */}
      <div>
        <h3 className="text-sm font-semibold text-aria-stone mb-3">Historique des paiements</h3>
        {stats.payments.length === 0 ? (
          <p className="text-sm text-aria-stone py-4 text-center">Aucun paiement enregistré</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead className="bg-aria-sand text-aria-stone text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Entreprise</th>
                  <th className="px-4 py-2 text-left">Période</th>
                  <th className="px-4 py-2 text-left">Type</th>
                  <th className="px-4 py-2 text-left">Méthode</th>
                  <th className="px-4 py-2 text-right">Montant FCFA</th>
                  <th className="px-4 py-2 text-right">USD</th>
                  <th className="px-4 py-2 text-right">Tokens</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E2D6]">
                {stats.payments.map((p) => {
                  const fcfa = p.amountFcfa > 0 ? p.amountFcfa : Math.round(p.amount * 600);
                  return (
                    <tr key={p.id} className="hover:bg-aria-sand">
                      <td className="px-4 py-2 text-aria-stone">{new Date(p.paidAt).toLocaleDateString("fr-FR")}</td>
                      <td className="px-4 py-2 font-medium text-aria-anthracite">{p.tenant.name}</td>
                      <td className="px-4 py-2 text-aria-stone">{p.period}</td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${p.type === "topup" ? "bg-aria-indigo/10 text-aria-indigo" : "bg-blue-100 text-blue-700"}`}>
                          {p.type === "topup" ? "⚡ Recharge" : "📅 Abonnement"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs bg-aria-sand text-aria-stone">{p.method}</span>
                      </td>
                      <td className="px-4 py-2 text-right font-semibold text-green-700">{fmtFcfa(fcfa)}</td>
                      <td className="px-4 py-2 text-right text-aria-stone text-xs">{fmtUsd(fcfa / FCFA_PER_USD)}</td>
                      <td className="px-4 py-2 text-right text-xs">
                        {p.tokensAdded > 0 ? <span className="text-aria-indigo font-medium">+{fmtTokens(p.tokensAdded)}</span> : <span className="text-aria-stone">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Grille tarifaire */}
      <div className="bg-aria-sand border border-gray-200 rounded-xl p-4">
        <h3 className="text-xs font-semibold text-aria-stone uppercase mb-3">Grille tarifaire</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          {[
            { plan: "Starter", fcfa: 25_000, tokens: "500K" },
            { plan: "Pro", fcfa: 75_000, tokens: "2M" },
            { plan: "Enterprise", fcfa: 150_000, tokens: "5M" },
            { plan: "Recharge", fcfa: 10_000, tokens: "+200K", isTopup: true },
          ].map((item) => (
            <div key={item.plan} className={`rounded-lg p-3 ${item.isTopup ? "bg-aria-indigo/10 border border-aria-indigo/20" : "bg-white border border-gray-200"}`}>
              <p className={`text-xs font-semibold mb-1 ${item.isTopup ? "text-aria-indigo" : "text-aria-stone"}`}>{item.plan}</p>
              <p className={`font-bold ${item.isTopup ? "text-aria-indigo" : "text-aria-anthracite"}`}>{fmtFcfa(item.fcfa)}</p>
              <p className="text-xs text-aria-stone">{fmtUsd(item.fcfa / FCFA_PER_USD)} · {item.tokens} tokens</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal enregistrer paiement */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-aria-anthracite mb-4">Enregistrer un paiement</h2>
            <form onSubmit={submitPayment} className="space-y-3">
              {/* Type */}
              <div>
                <label className="block text-xs font-medium text-aria-stone mb-1">Type de paiement</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["subscription", "topup"] as const).map((t) => (
                    <button
                      key={t} type="button"
                      onClick={() => setForm((f) => ({ ...f, type: t }))}
                      className={`px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
                        form.type === t
                          ? t === "topup" ? "bg-aria-indigo border-aria-indigo text-white" : "bg-blue-600 border-blue-600 text-white"
                          : "border-gray-300 text-aria-stone hover:bg-aria-sand"
                      }`}
                    >
                      {t === "topup" ? "⚡ Recharge tokens" : "📅 Abonnement mensuel"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Entreprise */}
              <div>
                <label className="block text-xs font-medium text-aria-stone mb-1">Entreprise</label>
                <select required value={form.tenantId}
                  onChange={(e) => {
                    const t = stats.tenants.find((t) => t.id === e.target.value);
                    setForm((f) => ({
                      ...f,
                      tenantId: e.target.value,
                      amountFcfa: form.type === "subscription" && t ? String(PLAN_PRICE_FCFA[t.plan] ?? 25_000) : f.amountFcfa,
                    }));
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0">
                  <option value="">Sélectionner…</option>
                  {stats.tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.plan}){!t.isPaidThisMonth ? " ⚠️" : " ✅"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Montant */}
              <div>
                <label className="block text-xs font-medium text-aria-stone mb-1">
                  Montant (FCFA)
                  {suggestedPrice && form.type === "subscription" && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, amountFcfa: String(suggestedPrice) }))}
                      className="ml-2 text-aria-indigo hover:underline font-normal">
                      ← Suggéré : {fmtFcfa(suggestedPrice)}
                    </button>
                  )}
                  {form.type === "topup" && (
                    <button type="button" onClick={() => setForm((f) => ({ ...f, amountFcfa: String(TOPUP_FCFA) }))}
                      className="ml-2 text-aria-indigo hover:underline font-normal">
                      ← {fmtFcfa(TOPUP_FCFA)} par tranche
                    </button>
                  )}
                </label>
                <div className="relative">
                  <input required type="number" step="500" min="0"
                    placeholder={form.type === "topup" ? "10000" : "25000"}
                    value={form.amountFcfa}
                    onChange={(e) => setForm((f) => ({ ...f, amountFcfa: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0 pr-16" />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-aria-stone">FCFA</span>
                </div>
                {form.amountFcfa && (
                  <p className="text-xs text-aria-stone mt-0.5">
                    ≈ {fmtUsd(Number(form.amountFcfa) / FCFA_PER_USD)}
                    {form.type === "topup" && tokensForTopup > 0 && (
                      <span className="text-aria-indigo ml-2">→ +{fmtTokens(tokensForTopup)} tokens</span>
                    )}
                  </p>
                )}
              </div>

              {/* Période + Méthode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-aria-stone mb-1">Période</label>
                  <input type="month" required value={form.period}
                    onChange={(e) => setForm((f) => ({ ...f, period: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-aria-stone mb-1">Méthode</label>
                  <select value={form.method}
                    onChange={(e) => setForm((f) => ({ ...f, method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0">
                    <option value="cash">Cash</option>
                    <option value="wave">Wave</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="virement">Virement bancaire</option>
                  </select>
                </div>
              </div>

              {/* Référence + Notes */}
              <div>
                <label className="block text-xs font-medium text-aria-stone mb-1">Référence (optionnel)</label>
                <input type="text" placeholder="N° reçu" value={form.reference}
                  onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0" />
              </div>
              <div>
                <label className="block text-xs font-medium text-aria-stone mb-1">Notes (optionnel)</label>
                <textarea value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-aria-indigo focus:ring-0 resize-none" />
              </div>

              {/* Résumé */}
              {form.tenantId && form.amountFcfa && (
                <div className={`rounded-lg p-3 text-sm ${form.type === "topup" ? "bg-aria-indigo/10" : "bg-blue-50"}`}>
                  <p className={`font-medium ${form.type === "topup" ? "text-aria-indigo" : "text-blue-800"}`}>
                    {form.type === "topup"
                      ? `⚡ Recharge de ${fmtFcfa(Number(form.amountFcfa))} → +${fmtTokens(tokensForTopup)} tokens`
                      : `📅 Paiement abonnement ${form.period} : ${fmtFcfa(Number(form.amountFcfa))}`}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => { setShowForm(false); setForm(defaultForm); }}
                  className="flex-1 border border-aria-indigo text-aria-indigo rounded-lg px-4 py-2 text-sm hover:bg-aria-indigo-light">
                  Annuler
                </button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-aria-terracotta text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-aria-terracotta-dark disabled:opacity-50">
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color = "default" }: { label: string; value: string | number; color?: "default" | "green" | "red" }) {
  const colors = { default: "text-aria-anthracite", green: "text-green-700", red: "text-red-600" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
      <p className="text-xs text-aria-stone uppercase font-medium">{label}</p>
      <p className={`text-xl font-bold mt-1 truncate ${colors[color]}`}>{value}</p>
    </div>
  );
}
