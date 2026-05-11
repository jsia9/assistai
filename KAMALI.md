# Kamali — Documentation produit

> **Powered by Claude · Anthropic**  
> Assistant IA professionnel conçu pour les entreprises francophones d'Afrique de l'Ouest.

---

## Table des matières

1. [À propos de Kamali](#1-à-propos-de-kamali)
2. [Pour qui ?](#2-pour-qui-)
3. [Fonctionnalités utilisateur](#3-fonctionnalités-utilisateur)
4. [Projets et documents](#4-projets-et-documents)
5. [Administration d'entreprise](#5-administration-dentreprise)
6. [Facturation](#6-facturation)
7. [Administration globale (Superadmin)](#7-administration-globale-superadmin)
8. [Offres et tarifs](#8-offres-et-tarifs)
9. [Architecture technique](#9-architecture-technique)
10. [Accès et déploiement](#10-accès-et-déploiement)

---

## 1. À propos de Kamali

**Kamali** est une plateforme SaaS multi-entreprises qui donne accès à Claude, le modèle d'intelligence artificielle d'Anthropic, via une interface web professionnelle adaptée au contexte africain.

L'application permet à des entreprises de disposer d'un assistant IA puissant, sécurisé et géré, sans avoir à configurer des clés API ni à payer directement Anthropic. L'opérateur (AssistAI / SIA Agile Solutions) gère l'infrastructure, la facturation et l'accès pour le compte de chaque client entreprise.

**Ce que Kamali n'est pas :** Kamali n'est pas un chatbot grand public. C'est un outil de travail professionnel, déployé au niveau de l'entreprise, avec gestion des utilisateurs, quotas de tokens, et facturation mensuelle.

---

## 2. Pour qui ?

### Entreprises cibles

Kamali est destiné aux **entreprises francophones d'Afrique de l'Ouest** (Mali, Sénégal, Côte d'Ivoire, Burkina Faso, Niger, Guinée, Togo, Bénin, etc.) qui souhaitent intégrer l'IA dans leur travail quotidien sans friction technique.

**Secteurs particulièrement adaptés :**

| Secteur | Cas d'usage typiques |
|---------|---------------------|
| **Cabinets juridiques** | Rédaction de contrats, analyse de textes OHADA, recherches jurisprudentielles |
| **Banques & microfinance** | Analyse de dossiers, rédaction de rapports BCEAO, synthèse réglementaire |
| **ONG & bailleurs** | Rédaction de rapports de projet, traduction, analyse de données terrain |
| **Cabinets comptables** | Analyse fiscale, rédaction de notes, tableaux financiers |
| **Agences de communication** | Rédaction de contenus, brainstorming, traduction |
| **Entreprises industrielles** | Documentation technique, aide à la décision, rapports |
| **Administrations publiques** | Rédaction administrative, synthèse de textes officiels |

### Profils utilisateurs

- **Utilisateur standard** — Employé d'une entreprise cliente. Accède au chat, crée des projets, analyse des documents.
- **Admin d'entreprise** — Responsable IT ou directeur. Gère les utilisateurs de son entreprise, change les mots de passe, consulte les statistiques.
- **Superadmin** — Opérateur Kamali. Gère toutes les entreprises, enregistre les paiements, configure les offres.

---

## 3. Fonctionnalités utilisateur

### 3.1 Chat avec l'IA

L'interface de chat reproduit l'expérience de Claude.ai avec des adaptations professionnelles :

- **Streaming en temps réel** — Les réponses s'affichent mot par mot, comme une vraie conversation.
- **Rendu Markdown complet** — Tableaux, listes, titres, blocs de code avec coloration syntaxique, citations, liens, gras, italique.
- **Historique des conversations** — Toutes les conversations sont sauvegardées et accessibles depuis la sidebar.
- **Plusieurs conversations** — L'utilisateur peut en avoir autant qu'il souhaite, organisées par date.

### 3.2 Pièces jointes et analyse de fichiers

L'utilisateur peut joindre des fichiers à ses messages. Kamali extrait le contenu et le transmet à Claude pour analyse.

**Formats supportés :**

| Type | Extensions | Ce que Claude reçoit |
|------|-----------|---------------------|
| PDF | `.pdf` | Texte extrait intégralement |
| Word | `.docx` | Texte brut extrait |
| Excel | `.xlsx`, `.xls` | Contenu CSV de chaque feuille |
| Texte / Code | `.txt`, `.csv`, `.json`, `.py`, `.js`, `.ts`, `.html`, `.md`… | Contenu brut |
| Images | `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp` | Image transmise en base64 (vision) |

**Taille maximale :** 4 Mo par fichier (limite Vercel sur les fonctions serverless ; pour des fichiers plus volumineux, un upload direct vers Supabase Storage est en cours d'évaluation).

Plusieurs fichiers peuvent être joints au même message. Les images sont affichées en miniature dans la bulle utilisateur.

### 3.3 Analyse d'images (vision)

Claude peut voir et analyser des images : photos, captures d'écran, schémas, graphiques, documents scannés. L'utilisateur joint l'image et pose sa question en texte.

### 3.4 Génération et téléchargement de fichiers

Quand Claude génère du code ou un fichier (script Python, HTML, JSON, CSV…), un bouton **⬇ Télécharger** apparaît directement sous le bloc de code, avec l'extension correcte selon le langage.

Un bouton **📋 Copier** est également présent sur chaque bloc de code.

### 3.5 Copier une réponse

Un bouton **Copier** (📋) apparaît sous chaque message de l'IA, permettant de copier l'intégralité de la réponse en un clic.

### 3.6 Régénérer une réponse

Un bouton **Régénérer** (↺) permet de relancer la dernière requête si la réponse ne convient pas. L'ancienne réponse est supprimée de l'historique et remplacée par la nouvelle.

### 3.7 Interface bilingue (page d'accueil)

La page d'accueil est disponible en **français** et en **anglais**, avec bascule en un clic.

---

## 4. Projets et documents

Inspirée de la fonctionnalité "Projects" de Claude.ai, cette section permet à chaque utilisateur de créer des espaces de travail thématiques.

### Concept

Un **projet** est un espace privé (visible uniquement par son créateur) qui regroupe :
- Un **nom** et des **instructions personnalisées** (prompt système propre au projet)
- Des **documents** téléversés comme contexte permanent
- Les **conversations** liées à ce projet

**Exemple :** Un juriste crée un projet "Contrats OHADA" avec les textes de loi pertinents en documents. Toutes ses conversations dans ce projet ont accès à ces textes sans les recopier à chaque fois.

### Documents de projet

- **Formats acceptés :** Tous les formats textuels (PDF, Word, Excel, texte, code). Les images ne sont pas acceptées comme documents de projet.
- **Extraction automatique :** Le contenu est extrait au téléversement et stocké en base de données.
- **Comptage de tokens :** Chaque document affiche une estimation de tokens (`longueur / 4`).
- **Alerte quota :** Un avertissement s'affiche si le total dépasse 150 000 tokens.
- **Injection automatique :** À chaque message dans un projet, le contenu des documents est injecté en contexte système avant la question de l'utilisateur.

### Instructions de projet

Chaque projet peut avoir un **prompt système personnalisé** qui s'applique à toutes les conversations du projet (ex : "Tu es un assistant spécialisé en droit OHADA. Réponds uniquement en français formel.").

### Suppression

- Supprimer un **document** : retire le contexte du projet, les conversations existantes ne sont pas affectées.
- Supprimer un **projet** : les conversations associées sont conservées (elles perdent juste le lien avec le projet), les documents sont supprimés.

---

## 5. Administration d'entreprise

Les utilisateurs avec le rôle `admin` ont accès au tableau de bord d'administration (`/admin`), limité aux données de leur propre entreprise.

### Onglet Utilisateurs

- Liste de tous les utilisateurs de l'entreprise
- **Activer / Suspendre** un compte (un utilisateur suspendu ne peut plus se connecter)
- **Changer le mot de passe** d'un utilisateur (utile pour les onboardings ou les réinitialisations)
- Voir le nombre de messages envoyés ce mois et la date de dernière activité

### Onglet Utilisation

- Graphique d'activité : nombre de messages par jour sur les 30 derniers jours
- Consommation de tokens par rapport au quota mensuel (barre de progression colorée)
- Affichage du coût API estimé

### Onglet Facturation

- Statut du paiement du mois en cours
- Historique des paiements
- Montants affichés en **FCFA** (et USD entre parenthèses)

---

## 6. Facturation

### Modèle économique

Kamali fonctionne sur un modèle d'**abonnement mensuel prépayé en espèces**. L'entreprise remet le montant à un représentant Kamali, qui enregistre le paiement dans le système.

Il n'y a **pas de paiement en ligne** pour l'instant — uniquement le cash, adapté aux réalités du marché ouest-africain.

### Vue entreprise (`/billing`)

Accessible à tous les utilisateurs via le lien 💳 **Facturation** dans la sidebar :

- **Statut du mois** : ✅ À jour ou ⚠️ En attente
- **Montant dû** en FCFA et en USD
- **Instructions de paiement** : contacter le représentant Kamali
- **Recharge de tokens** : information sur l'option de tokens supplémentaires
- **Historique** : tous les paiements passés (abonnements + recharges)

### Recharge de tokens

Si une entreprise dépasse son quota mensuel, elle peut acheter des tokens supplémentaires :

- **10 000 FCFA** → **+200 000 tokens** ajoutés immédiatement au quota du mois
- Activé par le superadmin lors de l'enregistrement du paiement

---

## 7. Administration globale (Superadmin)

Le compte superadmin (`jamal@siaagilesolutions.com`) a une vue sur **toutes les entreprises**.

### Tableau de bord étendu

- Statistiques globales : toutes les entreprises, tous les utilisateurs
- Alerte automatique si des entreprises n'ont pas payé ce mois
- Badge rouge sur l'onglet Facturation indiquant le nombre de retardataires

### Gestion des entreprises

- **Configurer** chaque entreprise : plan, prompt système personnalisé
- **Modifier le quota** de tokens manuellement (clic sur le chiffre dans le tableau)
- **Changer le plan** (starter / pro / enterprise)

### Enregistrement des paiements

Le superadmin enregistre les paiements reçus via un formulaire :

| Champ | Description |
|-------|-------------|
| Type | Abonnement mensuel ou Recharge de tokens |
| Entreprise | Sélection dans la liste (les retardataires sont marqués ⚠️) |
| Montant FCFA | Avec conversion USD automatique |
| Période | Mois concerné (format AAAA-MM) |
| Méthode | Cash, Wave, Orange Money, virement |
| Référence | Numéro de reçu (optionnel) |

Pour une recharge, le système calcule automatiquement les tokens à ajouter (`montant / 10 000 × 200 000`) et les ajoute immédiatement au quota de l'entreprise.

### Création d'entreprises et d'utilisateurs

Via le terminal (scripts Prisma) :

```bash
# Lister toutes les entreprises et leurs IDs
npx tsx prisma/list-tenants.ts

# Ajouter un utilisateur dans une entreprise existante
EMAIL="user@company.com" NAME="Prénom Nom" TENANT_ID="clxxxxxxxx" \
PASSWORD="motdepasse123" ROLE="user" npx tsx prisma/add-user.ts

# Créer une nouvelle entreprise + premier utilisateur admin
COMPANY="Société XYZ" EMAIL="admin@xyz.com" NAME="Directeur XYZ" \
PASSWORD="pass123" ROLE="admin" PLAN="starter" TOKEN_LIMIT="500000" \
npx tsx prisma/create-company.ts
```

---

## 8. Offres et tarifs

| Offre | Prix mensuel | Tokens inclus | Cible |
|-------|-------------|--------------|-------|
| **Starter** | 25 000 FCFA (~$42) | 500 000 tokens | PME, cabinets de moins de 10 utilisateurs |
| **Pro** | 75 000 FCFA (~$125) | 2 000 000 tokens | Entreprises moyennes, usage intensif |
| **Enterprise** | 150 000 FCFA (~$250) | 5 000 000 tokens | Grandes structures, usage très élevé |
| **Recharge** | 10 000 FCFA (~$17) | +200 000 tokens | Supplément ponctuel en cours de mois |

**Taux de change indicatif :** 1 USD = 600 FCFA.

**À titre de référence :** 1 000 tokens ≈ 750 mots. Un utilisateur actif consomme entre 5 000 et 30 000 tokens par jour selon l'intensité d'usage.

---

## 9. Architecture technique

### Stack

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 16 (App Router) |
| Langage | TypeScript |
| Style | Tailwind CSS |
| Auth | NextAuth v4 (JWT, session) |
| Base de données | PostgreSQL (Supabase) |
| ORM | Prisma 7 |
| IA | Anthropic Claude (claude-sonnet-4-6) |
| Déploiement | Vercel |
| Streaming | Server-Sent Events (SSE) |

### Modèle de données principal

```
Tenant (entreprise)
  ├── Users (utilisateurs)
  ├── Projects (projets)
  │     └── ProjectDocuments (documents)
  │     └── Conversations (avec projectId)
  ├── Messages (tous les messages, avec comptage de tokens)
  └── Payments (paiements : subscriptions + top-ups)
```

### Sécurité et isolation des données

- Chaque entreprise (`Tenant`) est isolée : un admin ne peut voir que les données de son entreprise.
- Les mots de passe sont hashés avec bcrypt (facteur de coût 12).
- Le superadmin est le seul à pouvoir accéder aux données de toutes les entreprises.
- Les projets sont **privés par utilisateur** : un collègue de la même entreprise ne voit pas vos projets.

### Traitement des fichiers

- Le parsing s'effectue **côté serveur** (route `/api/upload`).
- Les fichiers ne sont **pas stockés** : seul le texte extrait est envoyé à Claude ou sauvegardé (pour les documents de projet).
- Les images sont transmises en base64 directement à l'API Anthropic (vision).

### Gestion des tokens et quotas

- Chaque message entrant et sortant est comptabilisé via l'API Anthropic (usage réel).
- Le quota mensuel est vérifié à chaque envoi : si dépassé, un message d'erreur est retourné.
- Les recharges incrémentent le quota (`monthlyTokenLimit`) directement sur le tenant.

---

## 10. Accès et déploiement

### URL de production

**https://assistai-six.vercel.app**

### Accès utilisateur

L'accès est **sur invitation uniquement**. Les personnes intéressées remplissent le formulaire de la page d'accueil ; le superadmin crée ensuite le compte manuellement et communique les identifiants.

### Variables d'environnement requises

```env
DATABASE_URL=               # URL PostgreSQL Supabase (avec pooler)
NEXTAUTH_SECRET=            # Clé secrète pour les sessions
NEXTAUTH_URL=               # URL de l'application
ANTHROPIC_API_KEY=          # Clé API Anthropic
NEXT_PUBLIC_APP_NAME=       # Nom de l'app (défaut : Kamali)
```

### Déploiement

```bash
# Build et déploiement en production
npx vercel --prod --yes
```

---

## Notes

- Le modèle de paiement **cash uniquement** est volontaire : il correspond aux habitudes de paiement B2B en Afrique de l'Ouest où les virements et paiements mobiles inter-entreprises ne sont pas encore systématiques.
- Le nom **Kamali** est un prénom swahili signifiant *perfection* ou *complétude* — un choix délibéré pour ancrer le produit dans une identité africaine tout en exprimant l'ambition de l'outil.
- L'application est conçue pour évoluer : support Wave / Orange Money, paiement en ligne, RAG avancé, et intégrations métier sont des axes de développement envisagés.

---

*Document interne — SIA Agile Solutions · Kamali v1.0 · Mai 2026*
