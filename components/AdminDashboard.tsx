"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
} from "recharts";

const COST_PER_1K = 0.01;
const MARKUP = 5;

interface TenantStat {
  id: string; name: string; plan: string; active: boolean;
  monthlyTokenLimit: number; userCount: number;
  tokensThisMonth: number; estimatedCost: number;
  estimatedRevenue: number; amountPaid: number;
  balance: number; pctUsed: number;
  systemPrompt: string | null;
}
interface UserRow {
  id: string; email: string; name: string | null; role: string;
  active: boolean; lastActiveAt: string; tenantId: string;
  tenant: { name: string }; messagesThisMonth: number;
}
interface PaymentRow {
  id: string; tenantId: string; amount: number; currency: string;
  method: string; reference: string | null; period: string;
  notes: string | null; paidAt: string;
  tenant: { name: string };
}
interface Stats {
  tenants: TenantStat[]; users: UserRow[];
  messagesThisMonth: number; estimatedRevenue: number;
  totalPaid: number; outstanding: number;
  dailyChart: { date: string; count: number }[];
  payments: PaymentRow[];
}

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

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Chargement…</div>;
  if (!stats) return <div className="min-h-screen flex items-center justify-center text-red-500">Erreur de chargement.</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Administration</h1>
        <Link href="/chat" className="text-sm text-indigo-600 hover:underline">← Retour au chat</Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard label="Entreprises" value={stats.tenants.length} />
          <StatCard label="Utilisateurs" value={stats.users.length} />
          <StatCard label="Messages ce mois" value={stats.messagesThisMonth} />
          <StatCard label="Revenu estimé" value={`$${stats.estimatedRevenue.toFixed(2)}`} color="green" />
          <StatCard label="Impayé" value={`$${stats.outstanding.toFixed(2)}`} color={stats.outstanding > 0 ? "red" : "green"} />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            {(["users", "usage", "billing"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-6 py-3 text-sm font-medium ${tab === t ? "border-b-2 border-indigo-600 text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}>
                {t === "users" ? "Utilisateurs" : t === "usage" ? "Utilisation" : "Facturation"}
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
  users,
  onToggle,
  isSuperAdmin,
  sessionTenantId,
  onRefresh,
}: {
  users: UserRow[];
  onToggle: (id: string) => void;
  isSuperAdmin: boolean;
  sessionTenantId: string;
  onRefresh: () => void;
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

  // Company admins only see their own tenant's users
  const visible = isSuperAdmin ? users : users.filter((u) => u.tenantId === sessionTenantId);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
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
        <tbody className="divide-y divide-gray-100">
          {visible.map((u) => (
            <tr key={u.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{u.email}</td>
              {isSuperAdmin && <td className="px-4 py-3 text-gray-600">{u.tenant.name}</td>}
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.role === "superadmin" ? "bg-red-100 text-red-700" : u.role === "admin" ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-600"}`}>
                  {u.role}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-600">{u.messagesThisMonth}</td>
              <td className="px-4 py-3 text-gray-500">{new Date(u.lastActiveAt).toLocaleDateString("fr-FR")}</td>
              <td className="px-4 py-3">
                <button onClick={() => onToggle(u.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${u.active ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700" : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"}`}>
                  {u.active ? "Actif" : "Suspendu"}
                </button>
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => { setPwdUserId(u.id); setPwdValue(""); setPwdError(""); }}
                  className="text-xs text-gray-500 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50"
                >
                  🔑 Modifier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Password change modal */}
      {pwdUserId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Nouveau mot de passe</h2>
            <p className="text-sm text-gray-500 mb-4">
              {visible.find((u) => u.id === pwdUserId)?.email}
            </p>
            <input
              type="password"
              autoFocus
              value={pwdValue}
              onChange={(e) => { setPwdValue(e.target.value); setPwdError(""); }}
              onKeyDown={(e) => { if (e.key === "Enter") savePassword(); }}
              placeholder="Nouveau mot de passe (min. 6 caractères)"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 mb-1"
            />
            {pwdError && <p className="text-xs text-red-600 mb-2">{pwdError}</p>}
            <div className="flex gap-3 mt-3">
              <button onClick={() => { setPwdUserId(null); setPwdValue(""); setPwdError(""); }}
                className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                Annuler
              </button>
              <button onClick={savePassword} disabled={pwdSaving || !pwdValue}
                className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
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
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Messages par jour (30 derniers jours)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={stats.dailyChart}>
            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(v) => v.slice(5)} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip labelFormatter={(v) => `Date: ${v}`} formatter={(v) => [`${v} messages`, ""]} />
            <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Quota & consommation par entreprise</h3>
        <div className="space-y-4">
          {stats.tenants.map((t) => (
            <div key={t.id} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-gray-900">{t.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${t.pctUsed >= 90 ? "bg-red-100 text-red-700" : t.pctUsed >= 70 ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}`}>
                    {t.pctUsed.toFixed(0)}% utilisé
                  </span>
                  {isSuperAdmin && (
                    <button
                      onClick={() => configId === t.id ? setConfigId(null) : openConfig(t)}
                      className="text-xs text-indigo-600 hover:underline"
                    >
                      {configId === t.id ? "Fermer" : "⚙ Configurer"}
                    </button>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                <div className={`h-2 rounded-full transition-all ${t.pctUsed >= 90 ? "bg-red-500" : t.pctUsed >= 70 ? "bg-yellow-500" : "bg-indigo-500"}`}
                  style={{ width: `${Math.min(t.pctUsed, 100)}%` }} />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{t.tokensThisMonth.toLocaleString("fr-FR")} / {t.monthlyTokenLimit.toLocaleString("fr-FR")} tokens</span>
                <span>Coût: ${t.estimatedCost.toFixed(3)} → Facturé: ${t.estimatedRevenue.toFixed(2)}</span>
              </div>

              {/* Inline config panel */}
              {configId === t.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Plan</label>
                      <select
                        value={configForm.plan}
                        onChange={(e) => setConfigForm((f) => ({ ...f, plan: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                      >
                        <option value="starter">starter</option>
                        <option value="pro">pro</option>
                        <option value="enterprise">enterprise</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Prompt système personnalisé
                      <span className="ml-1 text-gray-400 font-normal">(laissez vide pour utiliser le prompt global)</span>
                    </label>
                    <textarea
                      value={configForm.systemPrompt}
                      onChange={(e) => setConfigForm((f) => ({ ...f, systemPrompt: e.target.value }))}
                      rows={5}
                      placeholder="Ex : Tu es un assistant juridique spécialisé en droit OHADA pour le cabinet Diallo & Associés. Réponds uniquement en français formel..."
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-mono"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfigId(null)}
                      className="px-4 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={saveConfig}
                      disabled={saving}
                      className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
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
  const [form, setForm] = useState({ tenantId: "", amount: "", currency: "USD", method: "Wave", reference: "", period: new Date().toISOString().slice(0, 7), notes: "" });
  const [saving, setSaving] = useState(false);

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch("/api/admin/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    setSaving(false);
    setShowForm(false);
    setForm(f => ({ ...f, tenantId: "", amount: "", reference: "", notes: "" }));
    onRefresh();
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

  const currentPeriod = new Date().toISOString().slice(0, 7);

  return (
    <div className="p-4 space-y-6">

      {/* Summary by tenant */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700">Résumé facturation — {currentPeriod}</h3>
          {isSuperAdmin && (
            <button onClick={() => setShowForm(true)} className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-indigo-700">
              + Enregistrer un paiement
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Entreprise</th>
                <th className="px-4 py-3 text-left">Plan</th>
                <th className="px-4 py-3 text-right">Tokens</th>
                <th className="px-4 py-3 text-right">Coût API</th>
                <th className="px-4 py-3 text-right">À facturer</th>
                <th className="px-4 py-3 text-right">Encaissé</th>
                <th className="px-4 py-3 text-right">Solde</th>
                <th className="px-4 py-3 text-left">Quota/mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {stats.tenants.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">{t.plan}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-600">{t.tokensThisMonth.toLocaleString("fr-FR")}</td>
                  <td className="px-4 py-3 text-right text-gray-600">${t.estimatedCost.toFixed(3)}</td>
                  <td className="px-4 py-3 text-right font-medium text-gray-900">${t.estimatedRevenue.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-green-700 font-medium">${t.amountPaid.toFixed(2)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${t.balance > 0 ? "text-red-600" : "text-green-600"}`}>
                    ${t.balance.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    {editQuota?.id === t.id ? (
                      <div className="flex items-center gap-1">
                        <input type="number" value={editQuota.limit}
                          onChange={(e) => setEditQuota(q => q ? { ...q, limit: Number(e.target.value) } : q)}
                          className="w-24 border border-gray-300 rounded px-2 py-0.5 text-xs" />
                        <button onClick={saveQuota} disabled={saving} className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded">✓</button>
                        <button onClick={() => setEditQuota(null)} className="text-xs text-gray-400 px-1">✕</button>
                      </div>
                    ) : (
                      <button onClick={() => setEditQuota({ id: t.id, name: t.name, limit: t.monthlyTokenLimit })}
                        className="text-xs text-gray-600 hover:text-indigo-600 underline-offset-2 hover:underline">
                        {t.monthlyTokenLimit.toLocaleString("fr-FR")}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 font-semibold text-sm">
              <tr>
                <td className="px-4 py-3" colSpan={4}>Total</td>
                <td className="px-4 py-3 text-right">${stats.estimatedRevenue.toFixed(2)}</td>
                <td className="px-4 py-3 text-right text-green-700">${stats.totalPaid.toFixed(2)}</td>
                <td className={`px-4 py-3 text-right ${stats.outstanding > 0 ? "text-red-600" : "text-green-600"}`}>
                  ${stats.outstanding.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Payment history */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Historique des paiements</h3>
        {stats.payments.length === 0 ? (
          <p className="text-sm text-gray-400 py-4 text-center">Aucun paiement enregistré</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">Date</th>
                  <th className="px-4 py-2 text-left">Entreprise</th>
                  <th className="px-4 py-2 text-left">Période</th>
                  <th className="px-4 py-2 text-left">Méthode</th>
                  <th className="px-4 py-2 text-left">Référence</th>
                  <th className="px-4 py-2 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.payments.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 text-gray-500">{new Date(p.paidAt).toLocaleDateString("fr-FR")}</td>
                    <td className="px-4 py-2 font-medium">{p.tenant.name}</td>
                    <td className="px-4 py-2 text-gray-600">{p.period}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700">{p.method}</span>
                    </td>
                    <td className="px-4 py-2 text-gray-500 font-mono text-xs">{p.reference ?? "—"}</td>
                    <td className="px-4 py-2 text-right font-semibold text-green-700">${p.amount.toFixed(2)} {p.currency}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record payment modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Enregistrer un paiement</h2>
            <form onSubmit={submitPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Entreprise</label>
                <select required value={form.tenantId} onChange={(e) => setForm(f => ({ ...f, tenantId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="">Sélectionner…</option>
                  {stats.tenants.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Montant</label>
                  <input required type="number" step="0.01" min="0" placeholder="25.00" value={form.amount}
                    onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Devise</label>
                  <select value={form.currency} onChange={(e) => setForm(f => ({ ...f, currency: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option>USD</option><option>EUR</option><option>XOF</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Méthode</label>
                  <select value={form.method} onChange={(e) => setForm(f => ({ ...f, method: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option>Wave</option><option>Orange Money</option><option>Bank Transfer</option><option>manual</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Période</label>
                  <input type="month" required value={form.period} onChange={(e) => setForm(f => ({ ...f, period: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Référence (optionnel)</label>
                <input type="text" placeholder="N° reçu / transaction" value={form.reference}
                  onChange={(e) => setForm(f => ({ ...f, reference: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Notes (optionnel)</label>
                <textarea value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
              </div>
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">Annuler</button>
                <button type="submit" disabled={saving}
                  className="flex-1 bg-indigo-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
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
  const colors = { default: "text-gray-900", green: "text-green-700", red: "text-red-600" };
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
      <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${colors[color]}`}>{value}</p>
    </div>
  );
}
