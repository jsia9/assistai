# Paiements en ligne — Kamali

## Architecture

```
Client → POST /api/payments/initiate
               ↓  (router sélectionne le provider selon pays / préférence tenant)
         ┌─────┴──────────────────────┐
         │                            │
    CinetPay                  Orange Money Mali
    (BF, NE, GN…)              (ML — direct)
         │                            │
         └─────┬──────────────────────┘
               ↓
       POST /api/payments/webhook?provider=<name>
               ↓
        re-verify via provider.verify()
               ↓
        UPDATE Payment + Tenant
```

## Providers disponibles

| Provider | Pays | Env vars |
|---|---|---|
| `cinetpay` | BF, NE, GN, SN, CI, TG, BJ, CM | `CINETPAY_*` |
| `orange-money-mali` | **ML** | `OM_*` |

## Variables d'environnement requises

### Globales
| Variable | Description |
|---|---|
| `PAYMENTS_ENABLED` | `true` ou `false` (circuit breaker global) |
| `NEXTAUTH_URL` | URL de base de l'app (pour les callbacks) |

### CinetPay
| Variable | Description |
|---|---|
| `CINETPAY_API_KEY` | Clé API CinetPay |
| `CINETPAY_SITE_ID` | ID du site CinetPay |
| `CINETPAY_API_PASSWORD` | Mot de passe API |
| `CINETPAY_MODE` | `SANDBOX` ou `PRODUCTION` |
| `CINETPAY_BASE_URL` | `https://api-checkout.cinetpay.com/v2` |

### Orange Money Mali
| Variable | Description |
|---|---|
| `OM_CLIENT_ID` | Client ID du portail Orange Developer |
| `OM_CLIENT_SECRET` | Client Secret du portail Orange Developer |
| `OM_MERCHANT_KEY` | Merchant Key du back-office Orange Money Mali |
| `OM_BASE_URL` | (opt.) Override de la base API — défaut `https://api.orange.com` |
| `OM_MODE` | `SANDBOX` ou `PRODUCTION` |

## Flux de paiement

1. **Initiation** (`POST /api/payments/initiate`)
   - Authentification NextAuth requise
   - Rate limit : 10/min par IP (middleware), 5/5min par utilisateur
   - `getProvider(tenant)` : sélection par `tenant.preferredProvider` ou `tenant.country`
   - Crée un `Payment` en statut `PENDING`
   - Retourne `{ paymentUrl, transactionId }` → client redirige

2. **Retour client** (`/billing?tx=<transactionId>`)
   - BillingView détecte le paramètre `tx=`
   - Polling de `/api/payments/status` toutes les 3s (max 60s)

3. **Webhook** (`POST /api/payments/webhook?provider=<name>`)
   - Le `?provider=` est injecté dans `notifyUrl` lors de l'initiation
   - Dispatch vers le `parseWebhook()` du bon provider
   - **Re-vérifie toujours** via `provider.verify()` — jamais confiance aveugle au webhook
   - Idempotent : ignore si `status === "PAID"` déjà

   **Orange Money Mali** envoie du JSON ou du form-urlencoded. Le provider gère les deux.
   Le `notif_token` retourné à l'initiation est stocké dans `Payment.providerRef` ;
   la vérification du token est faite dans le handler (comparaison avec la DB).

4. **Vérification** (`GET /api/payments/status?tx=...`)
   - Retourne le statut du paiement pour le tenant courant
   - Authentification requise, isolation par tenant

## Modèle Payment — champs provider

| Champ | Type | Description |
|---|---|---|
| `transactionId` | `String? @unique` | ID ARIA (`ARIA-{tenantId}-{ts}-{uuid}`) |
| `providerName` | `String @default("cash")` | `"cash"`, `"cinetpay"`, `"orange-money-mali"` |
| `providerRef` | `String?` | Token provider (notif_token OM, pay_token CinetPay…) |
| `operator` | `String?` | `"OM"`, `"WAVE"`, `"MTN"`, `"MOOV"`, `"VISA"`… |
| `status` | `String @default("PAID")` | `"PENDING"` / `"PAID"` / `"FAILED"` / `"CANCELLED"` |
| `initiatedAt` | `DateTime` | Horodatage de l'initiation |
| `failureReason` | `String?` | Raison d'échec si applicable |
| `rawProviderPayload` | `Json?` | Réponse brute provider (pour audit) |

## Ajouter un nouveau provider

1. Créer `lib/payments/providers/<name>.ts` implémentant l'interface `PaymentProvider`
2. L'enregistrer dans `lib/payments/router.ts` : `PROVIDERS` + `COUNTRY_PROVIDER_MAP`
3. Exporter via `getProviderByName()` (automatique si enregistré dans `PROVIDERS`)
4. Ajouter les variables d'environnement dans `.env.example`

## Sécurité

- Les clés API ne transitent jamais côté client
- Le logger masque les champs sensibles (`apikey`, `password`, `secret`) et les numéros de téléphone
- Orange Money Mali : token OAuth2 caché en mémoire, renouvelé automatiquement (avec marge de 60s)
- Re-vérification via l'API provider — jamais de confiance aveugle au webhook
- Audit log complet : initiation, webhook reçu, paiement confirmé/échoué, tokens crédités
- Circuit breaker via `PAYMENTS_ENABLED=false`
- Webhook routé par nom de provider (`?provider=`) injecté à l'initiation

## Backfill

Pour les anciens paiements cash sans `transactionId` :

```bash
npx tsx prisma/backfill-payment-providers.ts
```
