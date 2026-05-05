"use client";

import { useState, useRef, useEffect, useCallback } from "react";

const TOKEN_WARN = 150_000;

interface ProjectDoc {
  id: string;
  name: string;
  tokenEstimate: number;
  sizeBytes: number;
  createdAt: string;
}

interface ProjectDetail {
  id: string;
  name: string;
  instructions: string | null;
  documents: ProjectDoc[];
  conversations: { id: string; title: string; updatedAt: string }[];
}

const ACCEPTED_FILES =
  ".pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.csv,.json,.xml,.yaml,.yml,.html,.js,.ts,.tsx,.jsx,.py,.java,.c,.cpp,.cs,.go,.rs,.php,.rb,.sql,.jpg,.jpeg,.png,.gif,.webp";

function fmtBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} Ko`;
  return `${(b / 1024 / 1024).toFixed(1)} Mo`;
}

export default function ProjectPanel({
  projectId,
  onBack,
  onStartConversation,
  onProjectDeleted,
  onProjectUpdated,
}: {
  projectId: string;
  onBack: () => void;
  onStartConversation: (projectId: string) => void;
  onProjectDeleted: () => void;
  onProjectUpdated: () => void;
}) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [instructions, setInstructions] = useState("");
  const [instructionsDirty, setInstructionsDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/projects/${projectId}`);
    if (res.ok) {
      const data: ProjectDetail = await res.json();
      setProject(data);
      setNameVal(data.name);
      setInstructions(data.instructions ?? "");
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => { load(); }, [load]);

  const totalTokens = project?.documents.reduce((s, d) => s + d.tokenEstimate, 0) ?? 0;

  async function saveName() {
    if (!nameVal.trim() || nameVal === project?.name) { setEditingName(false); return; }
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameVal }),
    });
    setSaving(false);
    setEditingName(false);
    await load();
    onProjectUpdated();
  }

  async function saveInstructions() {
    setSaving(true);
    await fetch(`/api/projects/${projectId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ instructions }),
    });
    setSaving(false);
    setInstructionsDirty(false);
    onProjectUpdated();
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);

    for (const file of files) {
      const form = new FormData();
      form.append("file", file);
      try {
        const upRes = await fetch("/api/upload", { method: "POST", body: form });
        if (!upRes.ok) { alert(`Erreur : ${await upRes.text()}`); continue; }
        const att = await upRes.json();

        if (att.type !== "text") {
          alert(`Les images ne peuvent pas être ajoutées aux projets. (${file.name})`);
          continue;
        }

        const docRes = await fetch(`/api/projects/${projectId}/documents`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: att.name,
            content: att.content,
            mimeType: att.mimeType ?? null,
            sizeBytes: file.size,
          }),
        });
        if (!docRes.ok) alert(`Erreur lors de l'ajout de ${file.name}`);
      } catch {
        alert("Erreur réseau.");
      }
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
    setUploading(false);
    await load();
    onProjectUpdated();
  }

  async function deleteDoc(docId: string) {
    await fetch(`/api/projects/${projectId}/documents/${docId}`, { method: "DELETE" });
    await load();
    onProjectUpdated();
  }

  async function deleteProject() {
    await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    onProjectDeleted();
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400">
        Chargement…
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex items-center justify-center text-red-400">
        Projet introuvable.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-700 text-sm">
          ← Retour
        </button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nameVal}
              onChange={(e) => setNameVal(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => { if (e.key === "Enter") saveName(); if (e.key === "Escape") { setEditingName(false); setNameVal(project.name); } }}
              className="w-full border-b-2 border-indigo-400 outline-none text-xl font-bold text-gray-900 bg-transparent"
            />
          ) : (
            <h1
              className="text-xl font-bold text-gray-900 truncate cursor-pointer hover:text-indigo-600"
              onClick={() => setEditingName(true)}
              title="Cliquer pour renommer"
            >
              📁 {project.name}
            </h1>
          )}
        </div>
        <button
          onClick={() => onStartConversation(project.id)}
          className="flex-shrink-0 bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          🗨 Nouvelle conversation
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-8 max-w-3xl mx-auto w-full">

        {/* Custom instructions */}
        <section>
          <h2 className="text-sm font-semibold text-gray-700 mb-2">
            Instructions personnalisées
            <span className="ml-2 text-gray-400 font-normal text-xs">
              (comportement de l&apos;IA dans ce projet)
            </span>
          </h2>
          <textarea
            value={instructions}
            onChange={(e) => { setInstructions(e.target.value); setInstructionsDirty(true); }}
            rows={5}
            placeholder="Ex : Tu es un assistant juridique spécialisé en droit des affaires OHADA. Réponds uniquement en français formel. Cite toujours tes sources..."
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none font-sans"
          />
          {instructionsDirty && (
            <div className="flex gap-2 mt-2">
              <button
                onClick={saveInstructions}
                disabled={saving}
                className="text-sm bg-indigo-600 text-white px-4 py-1.5 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
              <button
                onClick={() => { setInstructions(project.instructions ?? ""); setInstructionsDirty(false); }}
                className="text-sm border border-gray-300 px-4 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          )}
        </section>

        {/* Documents */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700">
              Documents ({project.documents.length})
            </h2>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
            >
              {uploading ? "⏳ Chargement…" : "📎 Ajouter des fichiers"}
            </button>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPTED_FILES}
            className="hidden"
            onChange={handleFileSelect}
          />

          {/* Token usage bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-gray-500">
                Contexte utilisé : ~{totalTokens.toLocaleString("fr-FR")} tokens estimés
              </span>
              {totalTokens > TOKEN_WARN && (
                <span className="text-orange-600 font-medium">⚠ Grand contexte</span>
              )}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  totalTokens > TOKEN_WARN
                    ? "bg-orange-500"
                    : totalTokens > TOKEN_WARN * 0.6
                    ? "bg-yellow-500"
                    : "bg-indigo-500"
                }`}
                style={{ width: `${Math.min((totalTokens / TOKEN_WARN) * 100, 100)}%` }}
              />
            </div>
            {totalTokens > TOKEN_WARN && (
              <p className="text-xs text-orange-600 mt-1">
                Ce projet contient beaucoup de documents. Les conversations seront plus lentes et coûteuses. Pensez à supprimer les fichiers peu utiles.
              </p>
            )}
          </div>

          {project.documents.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-400">
              <div className="text-3xl mb-2">📄</div>
              <p className="text-sm">Aucun document</p>
              <p className="text-xs mt-1">
                Ajoutez des PDF, Word, Excel, fichiers texte ou code.<br />
                Claude les lira dans chaque conversation de ce projet.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {project.documents.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center justify-between px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200 group"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">📄</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{doc.name}</p>
                      <p className="text-xs text-gray-400">
                        {fmtBytes(doc.sizeBytes)} · ~{doc.tokenEstimate.toLocaleString("fr-FR")} tokens
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => deleteDoc(doc.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 text-sm px-2 transition-opacity flex-shrink-0"
                    title="Supprimer ce document"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Danger zone */}
        <section className="border-t border-gray-100 pt-6">
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-red-500 hover:text-red-700 hover:underline"
            >
              🗑 Supprimer ce projet
            </button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3">
              <p className="text-sm text-red-700 font-medium">
                Supprimer &laquo;{project.name}&raquo; ?
              </p>
              <p className="text-xs text-red-600">
                Tous les documents seront supprimés. Les conversations existantes seront conservées mais perdront le contexte du projet.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={deleteProject}
                  className="text-sm bg-red-600 text-white px-4 py-1.5 rounded-lg hover:bg-red-700"
                >
                  Confirmer la suppression
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-sm border border-gray-300 px-4 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
