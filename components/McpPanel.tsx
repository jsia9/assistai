"use client";

import { useState, useEffect } from "react";

interface McpPanelProps {
  onClose: () => void;
}

interface Integration {
  id: string;
  service: string;
  label: string | null;
  status: string;
  createdAt: string;
}

const MCP_SERVICES = [
  {
    id: "github",
    name: "GitHub",
    icon: "🐙",
    category: "Code",
    needsOAuth: false,
    placeholder: "ghp_xxxxxxxxxxxx",
    hint: "Settings → Developer → Personal access tokens",
  },
  {
    id: "notion",
    name: "Notion",
    icon: "📝",
    category: "Productivité",
    needsOAuth: false,
    placeholder: "secret_xxxxxxxxxxxx",
    hint: "notion.so/my-integrations → New integration",
  },
  {
    id: "gmail",
    name: "Gmail",
    icon: "📧",
    category: "Communication",
    needsOAuth: true,
    placeholder: "",
    hint: "Connexion OAuth Google (disponible prochainement)",
  },
  {
    id: "slack",
    name: "Slack",
    icon: "💬",
    category: "Communication",
    needsOAuth: true,
    placeholder: "xoxb-xxxxxxxxxxxx",
    hint: "Connexion OAuth Slack (disponible prochainement)",
  },
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    icon: "📱",
    category: "Communication",
    needsOAuth: false,
    placeholder: "Clé API WhatsApp Business",
    hint: "business.whatsapp.com → API access",
  },
  {
    id: "drive",
    name: "Google Drive",
    icon: "📁",
    category: "Stockage",
    needsOAuth: true,
    placeholder: "",
    hint: "Connexion OAuth Google (disponible prochainement)",
  },
  {
    id: "calendar",
    name: "Google Agenda",
    icon: "📅",
    category: "Productivité",
    needsOAuth: true,
    placeholder: "",
    hint: "Connexion OAuth Google (disponible prochainement)",
  },
  {
    id: "linear",
    name: "Linear",
    icon: "📋",
    category: "Gestion",
    needsOAuth: false,
    placeholder: "lin_api_xxxxxxxxxxxx",
    hint: "Linear → Settings → API → Personal API keys",
  },
  {
    id: "jira",
    name: "Jira",
    icon: "🎯",
    category: "Gestion",
    needsOAuth: false,
    placeholder: "Token API Atlassian",
    hint: "id.atlassian.com → Security → API tokens",
  },
  {
    id: "teams",
    name: "Microsoft Teams",
    icon: "👥",
    category: "Communication",
    needsOAuth: true,
    placeholder: "",
    hint: "Connexion OAuth Microsoft (disponible prochainement)",
  },
];

export default function McpPanel({ onClose }: McpPanelProps) {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  // Which service card is expanded (showing the API key input)
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [apiKeyInputs, setApiKeyInputs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/integrations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) setIntegrations(data.integrations);
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, []);

  function isConnected(serviceId: string) {
    return integrations.some((i) => i.service === serviceId && i.status === "active");
  }

  async function handleSave(serviceId: string) {
    const apiKey = apiKeyInputs[serviceId]?.trim();
    if (!apiKey) return;
    setSaving(serviceId);
    setError(null);
    try {
      const res = await fetch("/api/integrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ service: serviceId, apiKey }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Erreur lors de la connexion.");
        return;
      }
      const saved: Integration = await res.json();
      setIntegrations((prev) => {
        const exists = prev.find((i) => i.service === serviceId);
        if (exists) return prev.map((i) => (i.service === serviceId ? saved : i));
        return [...prev, saved];
      });
      setExpandedService(null);
      setApiKeyInputs((prev) => ({ ...prev, [serviceId]: "" }));
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setSaving(null);
    }
  }

  async function handleDisconnect(serviceId: string) {
    setDeleting(serviceId);
    setError(null);
    try {
      const res = await fetch(`/api/integrations?service=${serviceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        setError("Erreur lors de la déconnexion.");
        return;
      }
      setIntegrations((prev) => prev.filter((i) => i.service !== serviceId));
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    // Overlay
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">🔌 Connexions MCP</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Connectez vos outils professionnels pour que LIYA puisse les utiliser
              directement dans vos conversations.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-4 flex-shrink-0"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mx-6 mt-3 px-3 py-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        {/* Service grid */}
        <div className="overflow-y-auto flex-1 px-6 py-4">
          {loadingList ? (
            <div className="text-center text-gray-400 text-sm py-12">Chargement…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {MCP_SERVICES.map((svc) => {
                const connected = isConnected(svc.id);
                const isExpanded = expandedService === svc.id;
                const isSaving = saving === svc.id;
                const isDeleting = deleting === svc.id;

                return (
                  <div
                    key={svc.id}
                    className={`border rounded-xl p-4 transition-all ${
                      connected
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    }`}
                  >
                    {/* Top row */}
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none mt-0.5">{svc.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-gray-900">
                            {svc.name}
                          </span>
                          <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium">
                            {svc.category}
                          </span>
                        </div>
                        {/* Status badge */}
                        {connected ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-green-700 font-medium">
                            ✅ Connecté
                          </span>
                        ) : svc.needsOAuth ? (
                          <span className="inline-flex items-center gap-1 mt-1 text-[11px] text-gray-400">
                            🔜 Bientôt disponible
                          </span>
                        ) : null}
                      </div>

                      {/* Action button */}
                      {connected ? (
                        <button
                          onClick={() => handleDisconnect(svc.id)}
                          disabled={isDeleting}
                          className="text-[11px] text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2.5 py-1 rounded-full transition-all flex-shrink-0 disabled:opacity-50"
                        >
                          {isDeleting ? "…" : "Déconnecter"}
                        </button>
                      ) : !svc.needsOAuth ? (
                        <button
                          onClick={() =>
                            setExpandedService(isExpanded ? null : svc.id)
                          }
                          className="text-[11px] text-white bg-gray-800 hover:bg-gray-700 px-2.5 py-1 rounded-full transition-all flex-shrink-0"
                        >
                          {isExpanded ? "Annuler" : "Connecter"}
                        </button>
                      ) : null}
                    </div>

                    {/* Expanded API key input */}
                    {isExpanded && !svc.needsOAuth && (
                      <div className="mt-3 space-y-2">
                        <p className="text-[10px] text-gray-500">{svc.hint}</p>
                        <div className="flex gap-2">
                          <input
                            type="password"
                            value={apiKeyInputs[svc.id] ?? ""}
                            onChange={(e) =>
                              setApiKeyInputs((prev) => ({
                                ...prev,
                                [svc.id]: e.target.value,
                              }))
                            }
                            placeholder={svc.placeholder}
                            className="flex-1 text-xs border border-gray-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-gray-500"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSave(svc.id);
                            }}
                          />
                          <button
                            onClick={() => handleSave(svc.id)}
                            disabled={isSaving || !apiKeyInputs[svc.id]?.trim()}
                            className="text-[11px] text-white bg-green-600 hover:bg-green-700 px-3 py-1.5 rounded-lg transition-all flex-shrink-0 disabled:opacity-50"
                          >
                            {isSaving ? "…" : "Sauvegarder"}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <p className="text-[10px] text-gray-400 text-center">
            Vos clés API sont stockées de façon sécurisée et ne sont jamais partagées.
            LIYA les utilise uniquement pour répondre à vos demandes.
          </p>
        </div>
      </div>
    </div>
  );
}
