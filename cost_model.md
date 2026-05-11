# Kamali — Modèle de coûts d'infrastructure

**Date :** 6 mai 2026
**Auteur :** Cowork (Claude) pour Jamal
**Stack actuelle :** Vercel (Next.js + serverless) · Supabase (PostgreSQL) · Anthropic API (claude-sonnet-4-6) · Nodemailer (invitations)
**État actuel observé :** 2 entreprises, 4 utilisateurs, 23 messages ce mois, 49K tokens consommés (6 % du quota Demo Tenant, 4 % du quota Test) → on est encore largement dans les niveaux gratuits / starter.

---

## 1. Hypothèses du modèle

### 1.1 Usage par utilisateur actif

KAMALI.md indique **5 000 à 30 000 tokens/jour selon l'intensité**. Je modélise trois profils :

| Profil | Tokens / jour | Jours actifs / mois | Tokens / utilisateur / mois |
|---|---|---|---|
| Léger (occasionnel) | 5 000 | 15 | **75 000** |
| Moyen (usage régulier) | 15 000 | 22 | **330 000** |
| Lourd (intensif) | 25 000 | 22 | **550 000** |

J'utilise le profil **moyen** comme référence et donne les bornes léger/lourd.

### 1.2 Ratio entrée/sortie + tarif Claude Sonnet 4.6

Pour un chat avec contexte projet (instructions + documents) et messages assez courts, le ratio typique est **~70 % input / 30 % output**.

- Input Sonnet 4.6 : **3,00 USD / million de tokens**
- Output Sonnet 4.6 : **15,00 USD / million de tokens**
- Coût mixte : 0,7 × 3 + 0,3 × 15 = **6,60 USD / million tokens**

⚠️ Le code Kamali (`app/api/chat/route.ts`) utilise une estimation interne `COST_PER_1K = 0.01` USD (= 10 USD / M tokens). C'est conservateur — ça surestime de ~50 % le coût réel. Bon pour la facturation client, mais pour le budget interne j'utilise 6,60 USD / M.

**Optimisation possible (non implémentée) :** prompt caching Anthropic baisse le tarif input à 0,30 USD / M sur les tokens cachés. Pour les projets avec gros documents, ça peut diviser le coût par 3-5. À considérer plus tard.

### 1.3 Coût Anthropic par utilisateur / mois

| Profil | Tokens/mois | Coût Sonnet 4.6 (sans cache) |
|---|---|---|
| Léger | 75 000 | **0,50 USD** |
| Moyen | 330 000 | **2,18 USD** |
| Lourd | 550 000 | **3,63 USD** |

Pour le modèle global, j'applique aussi un **taux d'activité réel** : tous les utilisateurs créés ne sont pas actifs chaque mois. J'utilise **70 % d'utilisateurs actifs**.

### 1.4 Tarifs Vercel et Supabase (mai 2026)

**Vercel** (https://vercel.com/pricing)
- Hobby : gratuit, **interdit pour usage commercial** → Kamali doit être au moins Pro.
- Pro : **20 USD / membre / mois**, 1 To bandwidth, 1 000 GB-h fonctions, 24 000 min build.
- Enterprise : sur devis, généralement à partir de ~3 500 USD / mois.

**Supabase** (https://supabase.com/pricing)
- Free : 500 Mo DB, 1 Go egress, projet pausé après 1 semaine d'inactivité → pas viable en prod.
- Pro : **25 USD / mois** + 8 Go DB inclus (puis 0,125 USD/Go), 250 Go egress, backups quotidiens, pas de pause.
- Team : 599 USD / mois.
- Enterprise : sur devis.

**Autres**
- Email transactionnel (Resend) : ~0 USD jusqu'à 3 000 emails/mois, ensuite ~20 USD pour 50K.
- Monitoring (Sentry Team) : ~26 USD / mois (optionnel).
- Domaine .com : ~12 USD / an (~1 USD / mois).

---

## 2. Projection de coûts

### 2.1 Tableau récap (USD / mois, profil moyen)

| Utilisateurs | Vercel | Supabase | Anthropic API | Autres | **TOTAL / mois** | Coût / user / mois |
|---|---|---|---|---|---|---|
| **10** | 20 | 25 | 15 | 1 | **~61 USD** | 6,10 USD |
| **50** | 20 | 25 | 76 | 1 | **~122 USD** | 2,44 USD |
| **100** | 20 | 25 | 153 | 5 | **~203 USD** | 2,03 USD |
| **1 000** | 100 (Pro × 5 sièges + bande passante) | 50 (DB > 8 Go) | 1 525 | 30 | **~1 705 USD** | 1,71 USD |

Calcul Anthropic = utilisateurs × 70 % actifs × 2,18 USD/user/mois.

### 2.2 Détail par fournisseur

#### Vercel

| Utilisateurs | Plan | Notes |
|---|---|---|
| 10 | Pro 20 USD | 1 siège suffit ; bandwidth & functions très loin des plafonds. |
| 50 | Pro 20 USD | Toujours 1 siège ; surveiller `Function GB-Hours` si streaming intensif. |
| 100 | Pro 20-40 USD | Possible upsize si pic de chat (streaming SSE = fonctions tenues longtemps). |
| 1 000 | Pro 100-300 USD ou Enterprise | À ce stade, mieux vaut un seul siège + acheter de la bande passante au besoin (overages ~40 USD / TB additionnel). Si SLA, négocier Enterprise. |

#### Supabase

| Utilisateurs | Plan | Notes |
|---|---|---|
| 10 | Pro 25 USD | DB ~50 Mo. |
| 50 | Pro 25 USD | DB ~250 Mo. |
| 100 | Pro 25 USD | DB ~500 Mo. |
| 1 000 | Pro 50-80 USD | DB approche 5-10 Go (8 Go inclus, puis 0,125 USD/Go). Dépend surtout du volume de messages stockés. Activer **purge des messages > 12 mois** pour freiner. |

Variable principale : **taille de la table Message** (tous les chats sont stockés). À 100 messages/user/mois × 2 KB/message × 1000 users = 200 MB/mois ajouté → 2,4 GB/an.

#### Anthropic API (le plus gros poste)

| Utilisateurs | Actifs (70 %) | Tokens/mois | Coût Sonnet 4.6 | Avec prompt-caching (-60 %) |
|---|---|---|---|---|
| 10 | 7 | 2,3 M | **15 USD** | 6 USD |
| 50 | 35 | 11,6 M | **76 USD** | 30 USD |
| 100 | 70 | 23,1 M | **153 USD** | 61 USD |
| 1 000 | 700 | 231 M | **1 525 USD** | 610 USD |

#### Autres (email + domaine)

Quasi négligeable jusqu'à 1 000 users. Resend gratuit suffit pour les invitations.

---

## 3. Bornes léger / moyen / lourd

Si tous les utilisateurs sont **lourds** (550 K tokens/mois chacun), multiplie le coût Anthropic par 1,67 :

| Users | Anthropic moyen | Anthropic lourd | Total moyen | Total lourd |
|---|---|---|---|---|
| 10 | 15 | 25 | 61 | 71 |
| 50 | 76 | 127 | 122 | 173 |
| 100 | 153 | 254 | 203 | 304 |
| 1 000 | 1 525 | 2 542 | 1 705 | 2 722 |

Si tous **légers** (75 K tokens/mois) → coût Anthropic ÷ 4 environ.

---

## 4. Revenus vs coûts

Plans Kamali (réf KAMALI.md §8) :

| Offre | Prix mensuel | Tokens inclus | Coût API correspondant (à 6,60 $/M) | Marge brute |
|---|---|---|---|---|
| Starter | 25 000 FCFA = **42 USD** | 500 K | 3,30 USD | **+38,70 USD (92 %)** |
| Pro | 75 000 FCFA = **125 USD** | 2 M | 13,20 USD | **+111,80 USD (89 %)** |
| Enterprise | 150 000 FCFA = **250 USD** | 5 M | 33 USD | **+217 USD (87 %)** |
| Recharge | 10 000 FCFA = **17 USD** | +200 K | 1,32 USD | **+15,68 USD (92 %)** |

**Marge brute moyenne ~89 %.** Très saine. Mais c'est sur l'API seulement — il faut amortir Vercel + Supabase aussi.

### 4.1 Seuil de rentabilité

Coût fixe minimum (Vercel + Supabase) = **45 USD / mois**.

| Mix d'offres | Revenus / 1 entreprise | Nombre d'entreprises pour amortir 45 USD fixes ? |
|---|---|---|
| 100 % Starter | 42 USD | **2 entreprises** suffisent à couvrir Vercel+Supabase (puis tout le reste = marge moins API). |
| 100 % Pro | 125 USD | 1 entreprise suffit déjà. |

Concrètement :

- **Avec 2 entreprises Starter** (~10 users), Kamali fait déjà 42 USD de marge sur API + 39 USD de couverture des fixes → **rentabilité positive dès le second client**.
- **À 50 utilisateurs** (~10 entreprises), revenus ~420 USD/mois, coûts ~122 USD/mois → **marge nette ~70 %**.
- **À 1 000 utilisateurs** (~200 entreprises Starter), revenus ~8 400 USD/mois, coûts ~1 705 USD/mois → **marge nette ~80 %**.

Le modèle économique tient bien.

---

## 5. Évolution des coûts

```
USD / mois
   2500 |
        |                                                             ●  lourd
   2000 |                                                        
        |                                                      ●  moyen
   1500 |                                                  
        |                                              ●     léger
   1000 |
        |
    500 |
        |                          ●
    100 |        ●           ●
     50 |    ●
        +---|------|--------|---------|----------------|---
            10     50       100       500            1000  utilisateurs
```

**Tendance :** quasi-linéaire en utilisateurs, dominé par Anthropic (~75-90 % du total à toutes les échelles).

---

## 6. Pistes d'optimisation

Par ordre de ROI :

### 1. Activer le prompt caching Anthropic — économies 40-60 % sur le poste Anthropic

`anthropic-beta: prompt-caching-2024-07-31` (header) ou paramètres de cache dans le SDK officiel. Les tokens d'un projet (instructions + documents injectés à chaque message) sont identiques pendant des heures → cachables à $0,30/M au lieu de $3/M en input.

**Économies à 1 000 users :** ~900 USD/mois (de 1 525 → ~610). Implémentation : 1-2 jours de dev.

### 2. Truncation/résumé des conversations longues — économies 20-30 %

Dans `app/api/chat/route.ts`, l'historique complet est renvoyé à chaque message. Pour des conversations de 50+ tours, ça enfle l'input. Solution : ne garder que les 20 derniers messages + un résumé des plus anciens.

### 3. Modèle moins cher pour les requêtes simples — Haiku 4.5

Tarif Haiku 4.5 : 1 USD/M input, 5 USD/M output. **Routing intelligent** : utiliser Haiku pour les questions courtes/factuelles, Sonnet pour les analyses complexes. Économies potentielles 30-50 % selon le mix.

### 4. Compression des documents projet — économies sur l'input

À chaque message dans un projet, le contenu de `ProjectDocument` est ré-injecté en system. Pour les gros docs (juridiques, contrats), c'est cher. Avec **prompt-caching activé**, ça devient quasi-gratuit (cf. point 1). Sans cache, considérer un mode "RAG léger" qui n'envoie que les sections pertinentes.

### 5. Purge automatique des données — limite la croissance Supabase

CRON mensuel : supprimer les conversations > 12 mois sans activité. Garde le DB sous 8 Go aussi longtemps que possible (= reste dans le tier Pro Supabase à 25 USD).

---

## 7. Falaises de scaling

À surveiller en temps réel :

| Seuil | Conséquence | Action |
|---|---|---|
| **8 Go DB Supabase** (~1500 users selon volume) | 0,125 USD/Go/mois supplémentaire | Activer purge messages anciens. |
| **1 To bandwidth Vercel/mois** | 40 USD/TB en overage | Optimiser SSR cache (déjà géré par Next.js). |
| **5 M tokens / 5 min Anthropic** | rate limit organisation | Demander relèvement à Anthropic. |
| **250 Go egress Supabase** | 0,09 USD/Go en overage | À 1 000 users avec usage moyen, on est ~50 Go/mois — confortable. |

---

## 8. Synthèse

À retenir, pour la roadmap business :

- **Coût marginal par utilisateur faible** : ~2 USD/user/mois sur Anthropic au profil moyen.
- **Coûts fixes minimes** : 45 USD (Vercel+Supabase Pro) jusqu'à 100+ utilisateurs.
- **Marge brute robuste** : 80-90 % à toutes les échelles modélisées, grâce à la grille tarifaire FCFA bien margée.
- **Une optimisation prioritaire : prompt caching** — 40-60 % d'économies sur le poste API quasi sans effort technique. À implémenter avant 200 utilisateurs.
- **À 1 000 utilisateurs** : coût total ~1 700 USD/mois, revenus prévisionnels ~8 000-10 000 USD/mois → **EBITDA positif de 6 000-8 000 USD/mois** sur l'infrastructure seule (hors RH, marketing).

---

*Modèle conservateur. Tous les chiffres sont en USD à 600 FCFA/USD. Sources : Vercel/Supabase/Anthropic public pricing pages, KAMALI.md §8 pour les tarifs Kamali, et le code `app/api/chat/route.ts` pour l'estimation de coût interne.*
