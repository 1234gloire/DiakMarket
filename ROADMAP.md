# DiakMarket — Cahier de suivi des chantiers

Document de référence pour savoir, à tout moment, ce qui est fait, en cours, ou pas commencé.
À tenir à jour à chaque avancée significative (nouveau module, fix important, décision
d'architecture). Les chantiers reprennent la structure du cahier des charges (§45 Roadmap)
adaptée à ce qui a réellement été construit.

**Dernière mise à jour** : 2026-09-22

**Légende** : ✅ Fait et vérifié · 🚧 Partiel / à finir · ⬜ Pas commencé

---

## Vue d'ensemble

| # | Chantier | Statut | Notes |
|---|----------|--------|-------|
| 1 | Backend — Architecture & infra | ✅ | NestJS, Prisma 7, Docker local, Supabase réel connecté |
| 2 | Backend — Modules métier | 🚧 | Cœur MVP fait ; paiement/livraison réels = Phase 5-6 |
| 3 | Auth & RBAC | ✅ | Vérifié avec vrais tokens Supabase (ES256/JWKS) |
| 4 | Tests automatisés backend | ✅ | 11 unitaires + 28 e2e, tous verts |
| 5 | Mobile — Acheteur (Flutter) | ✅ | Parcours complet vérifié en réel sur simulateur iOS |
| 6 | Mobile — Vendeur | ⬜ | Pas commencé |
| 7 | Mobile — Livreur | ⬜ | Pas commencé (bloqué par le chantier Livraison backend) |
| 8 | Paiements réels (PSP) | ⬜ | Seul le Mock existe |
| 9 | Livraison (dispatch, QR, OTP) | ⬜ | Module `deliveries` en lecture seule |
| 10 | Ledger financier (double-entrée) | ⬜ | Lecture seule, aucune écriture réelle |
| 11 | Dashboard Admin (Next.js) | ⬜ | Pas commencé |
| 12 | Notifications push (FCM) | ⬜ | Persistées en base, jamais envoyées |
| 13 | Déploiement / CI-CD | ⬜ | Pas de Dockerfile backend, pas de pipeline |
| 14 | Observabilité (Sentry, logs) | ⬜ | Logger Nest par défaut uniquement |

---

## 1. Backend — Architecture & infra ✅

- NestJS 12 (ESM), Prisma 7 avec driver adapter (`@prisma/adapter-pg`), PostgreSQL/PostGIS.
- Monorepo : `mobile/`, `backend/`, `admin/` (réservé).
- Docker Compose local (Postgres+PostGIS port 5433, Redis port 6380) pour le dev sans dépendre de Supabase.
- **Projet Supabase réel configuré et connecté** (`avgsdqhmgzzvwwieebmx`, org DiakGroup) : Auth (clés nouvelle génération, JWT ES256 vérifié via JWKS), Postgres via pooler Supavisor en mode session.
- Swagger (`/docs`), versionnement API (`/api/v1`).

**Reste à faire** : rien de bloquant. Amélioration possible : logs de requêtes HTTP structurés (utile pour debug, absent actuellement).

## 2. Backend — Modules métier 🚧

Fait et fonctionnel : `auth`, `users`, `countries`, `cities`, `addresses`, `categories`,
`products` (+images Cloudinary metadata), `favorites`, `offers`, `carts`, `orders` (+ machine
d'état complète), `stores`, `promotions`, `conversations`/`messages`, `commissions` (règles),
`ledger` (lecture), `withdrawals` (lecture/demande), `couriers` (inscription/dispo),
`deliveries` (lecture seule), `reviews`, `disputes`, `reports`, `notifications` (DB only),
`admin` (utilisateurs/rôles/audit basique).

**Reste à faire** :
- Analytics/KPI (§41 du cahier des charges) — aucun endpoint.
- Validation MIME/antivirus sur les uploads (on fait confiance aux métadonnées Cloudinary
  envoyées par le client).
- Offers/Messaging : backend fait, mais pas de UI mobile (post-MVP par le cahier des charges lui-même).

## 3. Auth & RBAC ✅

- Vérification JWT Supabase (HS256 legacy en fallback, JWKS pour les projets récents — **confirmé
  fonctionnel avec de vrais tokens signés ES256**).
- Provisioning JIT du user local à la première requête authentifiée.
- RBAC à deux niveaux : `@Roles` (grossier, niveau classe/méthode) et `@RequirePermissions`
  (fin, résolu via `RolePermission` en base — **infrastructure prête mais pas encore utilisée
  sur une route réelle**, à activer le jour où un besoin de permission fine se présente).

## 4. Tests automatisés backend ✅

- Unitaires (vitest) : machine d'état des commandes (graphe exhaustif), normalisation
  téléphone/email JIT (régression).
- E2E (vitest + supertest, vraie base Postgres de test dédiée `diakmarket_test`) : auth, RBAC,
  produits, commandes (checkout, stock, machine d'état complète), paiements (signature webhook,
  idempotence), litiges, avis.
- `npm run test` / `npm run test:e2e` depuis `backend/`.

**Reste à faire** : couverture des modules périphériques (stores, promotions, conversations,
withdrawals, couriers) — pas critique tant qu'ils ne sont pas exposés côté mobile.

## 5. Mobile — Acheteur (Flutter) ✅

Parcours complet **vérifié en conditions réelles** (simulateur iOS, vrai projet Supabase, vrai
backend) le 2026-09-22 par l'utilisateur : inscription → sélection pays → accueil/catalogue →
favoris → panier → checkout (livraison à domicile) → paiement (Mock + simulation dev) → commande
`PAID`.

Écrans existants : Splash/Login/Signup, sélection pays, Accueil (catégories + grille), Recherche
+ filtres, Fiche produit, Favoris, Panier, Checkout (+ gestion d'adresses), Paiement (avec
polling + boutons simulation dev), Liste commandes, Détail commande (timeline + confirmation
réception), Profil, Notation vendeur.

**Reste à faire** :
- Suivi de livraison réel (aujourd'hui juste le statut texte — pas de carte/tracking GPS, car
  le backend livraison n'est pas construit).
- Notifications push (aucun SDK FCM câblé côté app).
- Offres/messagerie (post-MVP, cf. cahier des charges §39).
- Tests automatisés Flutter (aucun `flutter test` écrit à ce jour).

## 6. Mobile — Vendeur ⬜

Rien construit. À faire : publier une annonce (upload photo réel vers Cloudinary — le backend
sait déjà générer la signature d'upload), gérer ses annonces, voir ses commandes/ventes,
consulter ses revenus, gérer les offres reçues (backend prêt).

## 7. Mobile — Livreur ⬜

Rien construit. Bloqué en bonne partie par le chantier 9 (dispatch/QR/OTP côté backend) — les
écrans "disponibilité" et "mes courses" pourraient démarrer avant, mais l'acceptation/scan/OTP
n'auront rien à consommer tant que le backend livraison n'existe pas.

## 8. Paiements réels (PSP) ⬜

Architecture prête (`PaymentProvider` abstrait, `MockPaymentProvider` fonctionnel, webhook avec
vérification de signature + idempotence — tout testé). **Aucun PSP réel branché** (Wave, Orange
Money, MTN MoMo, Airtel Money, Moov Money) : nécessite des identifiants réels par pays, pas
inventés par principe (cahier des charges §44).

## 9. Livraison — dispatch, QR, OTP ⬜

Schéma Prisma prêt (PostGIS, `Delivery`, `Courier`, `DeliveryZone`, `DeliveryPricingRule`,
`OtpCode`). Module `deliveries` backend actuel = lecture seule uniquement. Manque : création
automatique de la livraison à `READY_FOR_PICKUP`, recherche de livreurs proches (requêtes
PostGIS), proposition/acceptation de course, génération QR, émission/vérification OTP.

## 10. Ledger financier (double-entrée) ⬜

Schéma prêt (`LedgerAccount`, `LedgerTransaction`, `Settlement`). Le service actuel ne fait que
lire ; aucune écriture réelle n'est postée au paiement/règlement/retrait. Un `TODO` précis marque
chaque endroit du code où ça doit se brancher (paiement réussi, résolution de litige, retrait
traité).

## 11. Dashboard Admin (Next.js) ⬜

Rien construit. Le backend expose déjà `GET /admin/users`, `PATCH .../roles`, `.../status`,
`GET /admin/audit-logs` — insuffisant pour un vrai dashboard (manque produits, commandes,
paiements, litiges, stats côté admin).

## 12. Notifications push (FCM) ⬜

Table `notifications` alimentée par le backend à chaque événement pertinent, mais rien n'envoie
réellement de push — pas de SDK Firebase Admin câblé, pas de processor BullMQ dédié.

## 13. Déploiement / CI-CD ⬜

Pas de `Dockerfile` pour le backend (seul `docker-compose.yml` existe, pour Postgres/Redis
locaux). Pas de pipeline CI (lint/test/build automatiques sur push). Pas d'environnement staging.

## 14. Observabilité ⬜

Logger NestJS par défaut uniquement. Pas de Sentry, pas de logs de requêtes HTTP structurés, pas
de métriques (temps de réponse, taux d'erreur).

---

## Décisions d'architecture à retenir

- **Argent** : toujours un entier en unité mineure de la devise, jamais de float. XOF/XAF ne
  sont jamais mélangés.
- **Prix final de commande** : toujours calculé côté serveur, jamais confiance au client.
- **Webhooks paiement** : signature vérifiée + idempotence obligatoire (testé).
- **Prisma 7 + Supabase** : `DATABASE_URL`/`DIRECT_URL` doivent utiliser le pooler Supavisor en
  **mode session** (port 5432), jamais le host direct (IPv6 only) ni le mode transaction (casse
  les prepared statements de `pg`). Détail dans `backend/README.md`.
- **JIT provisioning** : Supabase envoie `phone`/`email` vides comme `""`, jamais `null` —
  toujours normaliser avant d'écrire (colonnes uniques).

## Comment utiliser ce document

- Avant de démarrer un chantier, vérifier son statut ici.
- Après une session de travail qui fait avancer un chantier, mettre à jour son statut et sa
  section détaillée — pas besoin d'attendre la fin complète d'un chantier pour documenter le
  progrès partiel.
- Le detail technique (comment lancer, tester, config) reste dans `backend/README.md` et
  `mobile/README.md` — ce fichier est un état des lieux, pas un guide d'installation.
