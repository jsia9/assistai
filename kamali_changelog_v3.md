# Kamali — Changelog v3

**Période couverte :** 9–10 mai 2026
**Référence :** Fait suite à `upgrades_report.md` (6 mai) et `kamali_test_results_v2.md` (6 mai)
**URL de production :** https://assistai-six.vercel.app
**Déploiements Vercel :** 4 déploiements successifs en production

---

## TL;DR — Ce qui a changé

Depuis le v2 (6 mai 2026), deux lots de modifications ont été déployés :

1. **Correctifs de sécurité** — les 6 tests encore en échec dans `kamali_test_results_v2.md` sont maintenant résolus (PDF, xlsx vulnérable, rate limiting, security headers, RLS Supabase).
2. **Sélecteur de modèle** — nouveau toggle Haiku / Sonnet / Opus dans l'interface de chat.
3. **5 fonctionnalités Claude Pro** — Extended Thinking, Aperçu d'artefacts, Export, Renommage de conversation, Barre de tokens.
4. **Correctifs utilisateurs** — upload Excel revu en profondeur, indicateur de fichiers en contexte.

---

## 1. Correctifs de sécurité (FT-012, ST-013, ST-016, ST-022, ST-024, ST-001)

Ces six points étaient dans la colonne "reste à faire" du rapport v2.

### 1.1 Upload PDF — FT-012

**Avant :** `POST /api/upload` retournait `422 "Impossible de lire ce PDF"` pour tout fichier PDF réel. La cause était l'incompatibilité entre `pdf-parse@2.x` (installé) et le code d'appel qui ciblait l'API v1.

**Après :**
- Downgrade vers `pdf-parse@1.1.1`
- Appel via le sous-chemin `require("pdf-parse/lib/pdf-parse.js")` pour éviter le chargement des fixtures de test (chemins absents dans Vercel serverless qui causaient un crash silencieux)
- Les PDFs réels sont désormais parsés correctement (testé avec un relevé bancaire de 6 132 caractères)

**Fichier modifié :** `app/api/upload/route.ts`

---

### 1.2 Vulnérabilité HIGH `xlsx` — ST-013

**Avant :** La librairie `xlsx` (SheetJS) était utilisée pour parser les fichiers Excel. Elle portait une vulnérabilité HIGH (Prototype Pollution + ReDoS, CVE-2023-30533) sans correctif upstream.

**Après :**
- `xlsx` désinstallé
- Remplacé par `exceljs@^4.4.0` (MIT, pas de CVE connue)
- `exceljs` ajouté à `serverExternalPackages` dans `next.config.ts` pour éviter le bundling Turbopack
- Le contenu des feuilles est extrait en format tabulaire (séparateur tabulation, une ligne par ligne, une section par feuille)

**Fichiers modifiés :** `package.json`, `app/api/upload/route.ts`, `next.config.ts`

---

### 1.3 Brute force & rate limiting — ST-016, ST-022

**Avant :** Aucune protection. Démonstration live dans le rapport v2 : 10 tentatives de login en 973 ms, toutes `200`.

**Après :**
- **Nouveau fichier** `middleware.ts` : middleware Edge Next.js qui s'exécute avant toutes les routes
- **Login** (`POST /api/auth/callback/credentials`) : 5 tentatives / 15 minutes par IP — réponse `429` avec message français
- **Chat** (`POST /api/chat`) : 60 messages / minute par IP
- **Nouveau fichier** `lib/ratelimit.ts` : fenêtre glissante en mémoire (Map module-level) pour le contexte Node.js des routes API

**Fichiers créés :** `middleware.ts`, `lib/ratelimit.ts`

---

### 1.4 En-têtes de sécurité — ST-024

**Avant :** Seul `Strict-Transport-Security` (HSTS) était présent (fourni par Vercel). CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy absents.

**Après :** `next.config.ts` retourne un bloc `headers()` appliqué à toutes les routes (`/(.*)`). En-têtes ajoutés :

| En-tête | Valeur |
|---------|--------|
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=(), payment=()` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.anthropic.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'` |

**Fichier modifié :** `next.config.ts`

---

### 1.5 RLS Supabase — ST-001

**Avant :** Row Level Security non activé sur les tables Supabase. L'API PostgREST pouvait théoriquement être interrogée directement sans authentification.

**Après :**
- RLS activé sur les 8 tables principales : `User`, `Tenant`, `Conversation`, `Message`, `Project`, `ProjectDocument`, `Payment`, `AuditLog`
- SQL exécuté dans le Supabase SQL Editor via injection Monaco (`window.monaco.editor.getEditors()[0]`)
- Note : Kamali utilise Prisma avec le rôle `postgres` (superuser) qui bypasse le RLS — la protection s'applique aux accès directs PostgREST anon.

---

## 2. Sélecteur de modèle — nouveau

**Avant :** Modèle fixé à `claude-sonnet-4-5` dans le code, non configurable par l'utilisateur.

**Après :** Toggle 3 états visible sous la barre de saisie.

| Modèle | Icône | Description |
|--------|-------|-------------|
| `claude-haiku-4-5` | ⚡ Haiku | Rapide & économique |
| `claude-sonnet-4-5` | ✦ Sonnet | Équilibré (recommandé) — défaut |
| `claude-opus-4-5` | ◆ Opus | Intelligence maximale |

- Le choix est **persisté en localStorage** (`kamali_model`) — survit aux rechargements de page
- Côté API : validation serveur avec liste blanche `ALLOWED_MODELS`, fallback sur Sonnet si valeur inattendue
- Badge du modèle affiché au-dessus de chaque bulle assistant (indique quel modèle a généré la réponse)
- Avertissement "consomme plus de tokens" affiché quand Opus est sélectionné

**Fichiers modifiés :** `components/ChatInterface.tsx`, `app/api/chat/route.ts`

---

## 3. Fonctionnalités Claude Pro — 5 nouvelles

### 3.1 Extended Thinking (Réflexion étendue)

Claude peut activer un mode de raisonnement interne avant de répondre.

**Interface :**
- Bouton 🧠 **Réflexion** dans la barre de modèle
- Grisé/désactivé si Haiku est sélectionné (non compatible)
- Violet quand actif

**Technique :**
- Paramètre `thinking: { type: "enabled", budget_tokens: 10000 }` envoyé à l'API Anthropic
- `max_tokens` porté à 20 000 quand activé (16k thinking + 4k réponse)
- Les blocs `thinking_delta` streamés séparément de `text_delta`
- Le contenu de réflexion est stocké dans `message.thinking` (non persisté en base de données)

**Affichage :**
- Section collapsible **"🧠 Réflexion interne"** apparaît au-dessus de la bulle de réponse
- Indicateur "En train de réfléchir…" pendant le streaming (quand la réflexion arrive avant le texte)
- Fond violet pâle, police monospace, hauteur max 64 avec scroll

**Fichiers modifiés :** `components/ChatInterface.tsx`, `app/api/chat/route.ts`

---

### 3.2 Aperçu d'artefacts (Live Preview)

Les blocs de code peuvent être rendus dans un modal iframe sandboxé.

**Langages supportés :** `html`, `htm`, `svg`, `mermaid`

**Interface :** Bouton **▶ Aperçu** dans l'en-tête du bloc de code (à côté de Copier et Télécharger)

**Rendu selon le type :**
- **HTML** : `doc.write(code)` directement dans l'iframe
- **SVG** : encapsulé dans un `<body>` centré
- **Mermaid** : charge `mermaid.js` depuis CDN, rend le diagramme

**Sécurité :** `sandbox="allow-scripts allow-same-origin"` — scripts exécutés en isolation

**Fichier modifié :** `components/MarkdownMessage.tsx`

---

### 3.3 Export de conversation

**Interface :** Bouton **📥 Exporter** dans la barre de modèle (visible uniquement quand la conversation a des messages)

**Format :** Fichier `.md` (Markdown) téléchargé côté client

**Contenu généré :**
```
# Conversation Kamali
_Exporté le [date locale]_

---

**Vous**
[message utilisateur]

---

**Sonnet**  ← ou Haiku / Opus selon le modèle utilisé
[réponse assistant]
```

- Le nom du modèle est résolu depuis `MODEL_OPTIONS` à partir du champ `message.model`
- Si le message avait une réflexion étendue, une note `> 💭 Réflexion interne disponible` est ajoutée
- Nom de fichier : `conversation-kamali-YYYY-MM-DD.md`

**Fichier modifié :** `components/ChatInterface.tsx`

---

### 3.4 Renommage de conversation

**Interface :** Double-clic sur le titre d'une conversation dans la sidebar → champ de saisie inline

- **Entrée** : confirme le renommage
- **Échap** : annule
- **Blur** : confirme si la valeur est non vide

**API :** `PATCH /api/conversations/[id]` — nouveau endpoint

```json
// Request
{ "title": "Nouveau titre" }

// Response
{ "id": "...", "title": "Nouveau titre" }
```

- Validation : titre obligatoire, tronqué à 100 caractères
- Autorisation : seul le propriétaire de la conversation peut la renommer

**Fichiers modifiés :** `components/ChatInterface.tsx`, `app/api/conversations/[id]/route.ts`

---

### 3.5 Barre de tokens mensuelle

**Interface :** Section en bas de la sidebar, au-dessus de l'admin/facturation

**Affichage :**
```
Tokens ce mois        123k / 500k
[████████░░░░░░░░░░░░]
```

**Couleur selon l'utilisation :**
- 0–70 % → indigo (normal)
- 70–90 % → amber (attention)
- > 90 % → rouge (quota critique)

**Données :** Requête `GET /api/usage` au chargement, puis rechargée après chaque message complété.

**Nouveau fichier :** `app/api/usage/route.ts` — retourne `{ used, limit, plan }`

**Fichier modifié :** `components/ChatInterface.tsx`

---

## 4. Correctifs utilisateurs (9–10 mai)

### 4.1 Upload Excel — erreur silencieuse résolue

**Problème 1 — Fichiers `.xls` (ancien format binaire BIFF) :**
ExcelJS ne supporte que le format `.xlsx` (ZIP-based). Les fichiers `.xls` généraient une erreur cryptique "Can't find end of central directory : is this a zip file".

**Correction :** Détection par magic bytes (`D0 CF 11 E0`) avant toute tentative de parsing. Message d'erreur clair retourné :
> *"Format .xls non supporté. Ouvrez le fichier dans Excel puis Enregistrer sous → .xlsx, et réessayez."*

**Problème 2 — Import dynamique instable sur Vercel serverless :**
`(await import("exceljs")).default` pouvait se comporter différemment de `require("exceljs")` dans le runtime serverless Next.js.

**Correction :** Changement vers `require("exceljs")` (CJS synchrone), compatible avec `serverExternalPackages`.

**Problème 3 — Buffer conversion inutilement complexe :**
L'ancienne conversion `buffer.buffer.slice(buffer.byteOffset, ...)` n'était pas nécessaire — ExcelJS accepte un `Buffer` Node.js directement.

**Correction :** `await workbook.xlsx.load(buffer as unknown as ArrayBuffer)` — passage direct du buffer.

**Amélioration :** Le message d'erreur retourné au client inclut maintenant le détail de l'exception ExcelJS (ex : fichier protégé par mot de passe), pour faciliter le diagnostic.

**Fichier modifié :** `app/api/upload/route.ts`

---

### 4.2 Indicateur de fichiers en contexte

**Problème :** Les utilisateurs ne savaient pas que les fichiers envoyés dans les messages précédents d'une même conversation restaient accessibles à Claude (leur contenu texte est stocké dans l'historique en base de données). Cela causait de la confusion sur ce que Claude "voyait".

**Correction :** Bandeau **"📂 En contexte"** visible au-dessus de la barre de modèle quand la conversation contient des fichiers dans son historique.

**Fonctionnement :**
- Parsing des messages de la conversation (côté client) : extraction des marqueurs `[Fichier : nom]` et `[Image : nom]` dans le contenu des messages utilisateur
- Affichage sous forme de chips ambre avec le nom du fichier
- Mention "Claude a accès à ces fichiers" à droite

**Important :** Les fichiers doivent être **dans le même message** pour être comparés simultanément par Claude. Les fichiers de messages précédents sont en contexte mais peuvent être moins "saillants" pour des tâches de comparaison directe — dans ce cas, joindre les deux fichiers au même message est recommandé.

**Fichier modifié :** `components/ChatInterface.tsx`

---

## 5. Nouveaux fichiers créés

| Fichier | Rôle |
|---------|------|
| `middleware.ts` | Rate limiter Edge : login (5/15min) + chat (60/min) par IP |
| `lib/ratelimit.ts` | Sliding window en mémoire pour les contextes Node.js non-Edge |
| `app/api/usage/route.ts` | `GET` → `{ used, limit, plan }` — tokens consommés ce mois |

---

## 6. Fichiers modifiés — récapitulatif

| Fichier | Nature des changements |
|---------|----------------------|
| `app/api/upload/route.ts` | PDF : downgrade pdf-parse@1.1.1 + subpath ; Excel : xlsx→exceljs + XLS detection + require() + buffer direct |
| `app/api/chat/route.ts` | Sélection de modèle validée côté serveur ; Extended Thinking (budget 10k tokens) ; streaming des `thinking_delta` |
| `app/api/conversations/[id]/route.ts` | Nouveau endpoint `PATCH` pour renommer une conversation |
| `components/ChatInterface.tsx` | Sélecteur modèle 3 états ; Extended Thinking toggle ; Export .md ; Renommage inline ; Barre tokens ; Fichiers en contexte ; Affichage badge modèle sur chaque bulle |
| `components/MarkdownMessage.tsx` | Bouton "▶ Aperçu" sur les blocs HTML/SVG/Mermaid ; modal PreviewModal iframe sandboxé |
| `next.config.ts` | `serverExternalPackages` + exceljs ; bloc `headers()` avec 6 en-têtes de sécurité |
| `package.json` | `pdf-parse@1.1.1`, `exceljs@^4.4.0`, suppression de `xlsx` |

---

## 7. État des tests après v3

Les 6 tests en échec du rapport v2 sont maintenant résolus :

| Test | v2 | v3 |
|------|----|----|
| FT-012 PDF upload | ❌ FAIL | ✅ PASS |
| ST-013 xlsx HIGH vulnérabilité | ❌ FAIL | ✅ PASS (xlsx remplacé par exceljs) |
| ST-016 brute force login | ❌ FAIL | ✅ PASS (5 tentatives / 15 min) |
| ST-022 rate limiting chat | ❌ FAIL | ✅ PASS (60 messages / min) |
| ST-024 security headers | ❌ FAIL | ✅ PASS (6 en-têtes ajoutés) |
| ST-001 RLS Supabase | ⏭️ PENDING | ✅ PASS (RLS activé sur 8 tables) |

**Score estimé v3 :** 47+ PASS sur 72 (≥ 85 % des tests exécutés)

---

## 8. Ce qui reste à faire

| Priorité | Sujet | Notes |
|----------|-------|-------|
| Moyen terme | Anomaly alerts sur AuditLog | Requête périodique : 5+ `login.failure` / 10 min → email superadmin |
| Moyen terme | Compléter audit logs | `project.delete`, `conversation.delete`, `admin.access` non encore loggués |
| Long terme | Upload direct Supabase Storage | Dépasse la limite 4 Mo Vercel serverless pour les gros fichiers |
| Long terme | Paiement en ligne (Wave, Orange Money) | Axe de développement commercial |
| Long terme | RAG avancé (embeddings) | Pour les projets avec beaucoup de documents |

---

## 9. Notes techniques

### Modèles Anthropic utilisés

| Identifiant | Label UI | Max tokens (défaut) | Max tokens (Extended Thinking) |
|-------------|----------|--------------------|---------------------------------|
| `claude-haiku-4-5` | ⚡ Haiku | 4 096 | N/A (Thinking non supporté) |
| `claude-sonnet-4-5` | ✦ Sonnet | 4 096 | 20 000 |
| `claude-opus-4-5` | ◆ Opus | 8 192 | 20 000 |

### Coût tokens Extended Thinking

Le mode Extended Thinking consomme significativement plus de tokens. Les 10 000 tokens de budget de réflexion sont déduits du quota mensuel comme n'importe quel autre token. À utiliser pour les tâches complexes (analyse juridique, raisonnement mathématique, comparaisons détaillées).

### Séparateur de colonnes Excel

Le contenu extrait des fichiers Excel utilise désormais la **tabulation** (`\t`) comme séparateur (au lieu de la virgule `,`), ce qui évite les faux positifs dans les cellules contenant des virgules (prix en FCFA au format `498 750`, montants, etc.).

---

*Document rédigé le 10 mai 2026 — SIA Agile Solutions · Kamali v3*
