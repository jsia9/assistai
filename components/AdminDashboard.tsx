"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface TenantStat {
  id: string;
  name: string;
  plan: string;
  active: boolean;
  userCount: number;
  tokensThisMonth: number;
  estimatedCost: number;
  estimatedRevenue: number;
}

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: string;
  active: boolean;
  lastActiveAt: string;
  tenant: { name: string };
}

interface Stats {
  tenants: TenantStat[];
  users: UserRow[];
  messagesThisMonth: number;
  estimatedRevenue: number;
  dailyChart: { date: string; count: number }[];
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [tab, setTab] = useState<"users" | "usage">("users");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) setStats(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function toggleUser(id: string) {
    await fetch(`/api/admin/users/${id}/disable`, { method: "POST" });
    await load();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500">
        Chargement…
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Erreur de chargement des données.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Administration</h1>
        <Link href="/chat" className="text-sm text-indigo-600 hover:underline">
          ← Retour au chat
        </Link>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Entreprises"
            value={stats.tenants.length}
          />
          <StatCard label="Utilisateurs" value={stats.users.length} />
          <StatCard
            label="Messages ce mois"
            value={stats.messagesThisMonth}
          />
          <StatCard
            label="Revenu estimé"
            value={`$${stats.estimatedRevenue.toFixed(2)}`}
          />
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setTab("users")}
              className={`px-6 py-3 text-sm font-medium ${
                tab === "users"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Utilisateurs
            </button>
            <button
              onClick={() => setTab("usage")}
              className={`px-6 py-3 text-sm font-medium ${
                tab === "usage"
                  ? "border-b-2 border-indigo-600 text-indigo-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Utilisation
            </button>
          </div>

          {tab === "users" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Entreprise</th>
                    <th className="px-4 py-3 text-left">Rôle</th>
                    <th className="px-4 py-3 text-left">Dernière activité</th>
                    <th className="px-4 py-3 text-left">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {stats.users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {u.email}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {u.tenant.name}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            u.role === "admin"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {new Date(u.lastActiveAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => toggleUser(u.id)}
                          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                            u.active
                              ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                              : "bg-red-100 text-red-700 hover:bg-green-100 hover:text-green-700"
                          }`}
                        >
                          {u.active ? "Actif" : "Suspendu"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === "usage" && (
            <div className="p-4 space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Messages par jour (30 derniers jours)
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={stats.dailyChart}>
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v) => v.slice(5)}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      labelFormatter={(v) => `Date: ${v}`}
                      formatter={(v) => [`${v} messages`, ""]}
                    />
                    <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Utilisation par entreprise
                </h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left">Entreprise</th>
                        <th className="px-4 py-3 text-left">Plan</th>
                        <th className="px-4 py-3 text-left">Tokens</th>
                        <th className="px-4 py-3 text-left">Coût estimé</th>
                        <th className="px-4 py-3 text-left">Revenu estimé</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.tenants.map((t) => (
                        <tr key={t.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {t.name}
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded-full text-xs bg-indigo-100 text-indigo-700">
                              {t.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            {t.tokensThisMonth.toLocaleString("fr-FR")}
                          </td>
                          <td className="px-4 py-3 text-gray-600">
                            ${t.estimatedCost.toFixed(3)}
                          </td>
                          <td className="px-4 py-3 font-medium text-green-700">
                            ${t.estimatedRevenue.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-4">
      <p className="text-xs text-gray-500 uppercase font-medium">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
