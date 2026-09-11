# MediCare Connect

Système d'information hospitalier (SIH) : gestion intégrée des patients, rendez-vous, consultations, prescriptions, laboratoire, pharmacie, facturation et utilisateurs.

## Architecture

- **Frontend** (ce dépôt) : application React 19 + TypeScript + Vite, avec un mode double fonctionnel :
  - **Mode local** : toutes les données sont lues et écrites dans le `localStorage` (démo horsk ligne, aucune dépendance réseau).
  - **Mode backend** : le Django REST Framework (projet `Medicare_pro`, `http://localhost:8000/api/`) devient la source de vérité. Les données sont hydratées depuis le serveur puis consommées via la couche locale ; les créations et modifications sont répliquées vers le backend.
- **Backend** : Django REST Framework + JWT (SimpleJWT). CORS autorisé pour `http://localhost:3000`.

## Fonctionnalités

- Gestion des patients et des dossiers (archive, historique des consultations)
- Rendez-vous avec détection de conflits d'agenda
- Consultations, constantes vitales et historique médical
- Prescriptions électroniques (lignes, posologie, délivrance)
- Laboratoire (demandes, résultats, validation)
- Pharmacie (médicaments, seuils d'alerte, mouvements de stock locaux)
- Facturation (factures, paiements partiels, reçus)
- Utilisateurs et rôles (receptionniste, medecin, caissier, pharmacist, admin)
- Journal d'audit

## Prérequis

- Node.js 20+ (npm)
- Backend Django démarré sur `http://localhost:8000` pour le mode backend (facultatif en mode local)

## Installation

```bash
npm install
```

## Configuration

```bash
cp .env.example .env.local
```

La variable clé est `VITE_API_BASE_URL` (ex. `http://localhost:8000/api/`). En développement, si elle n'est pas définie, l'application passe par le proxy de Vite (`/api`).

La base d'URL et le mode backend peuvent aussi être réglés depuis l'interface (module **Paramètres**).

## Démarrage

```bash
npm run dev        # http://localhost:3000
npm run build      # build de production
npm run lint       # vérification TypeScript (tsc --noEmit)
```

## Comptes backend de démonstration

| Email | Rôle | Mot de passe |
| --- | --- | --- |
| `mtaacomedy@medicare.fr` | receptionniste | (compte existant backend) |
| `mtaacomedy@medicare.bi` | medecin | (compte existant backend) |
| `mtaacomedy@medicare.cd` | admin | (compte existant backend) |

## Synchronisation backend

- **Lecture** : bouton **Réhydrater depuis le serveur** (Paramètres) — les listes du backend sont normalisées (noms MAJUSCULES, statuts EN→FR, numéros internes) puis écrites dans le `localStorage` ; les données locales sont sauvegardées et restaurées en cas de retour au mode local.
- **Création** : une entité créée en mode backend est enregistrée côté serveur (avec les bonnes clés étrangères : médecin, patient, consultation, etc.) ainsi que localement.
- **Modification** : les mises à jour locales sont répliquées en `PATCH` sur l'entité backend lorsque celle-ci a déjà été répliquée (référence stockée). Sans référence, la modification reste locale.
- **Limites connues** :
  - Le backend n'expose pas `/api/stock-movements/` ni `/api/medication-sales/` ; les mouvements de stock sont gérés localement.
  - Une entité créée en mode local puis rattachée au backend n'est pas écrite sur le serveur tant qu'elle n'est pas répliquée.
  - Les entités déjà présentes côté backend avant une réhydratation complète (patients enregistrés avant les corrections de nommage) doivent être recréées ou réparées manuellement.

## Structure du projet

```
src/
├── components/     # Composants React (UI, pages, modales)
├── services/       # apiService.ts, djangoApiClient.ts, backendSync.ts, mockData.ts
├── types/          # Types TypeScript partagés
├── hooks/          # Hooks React
└── utils/          # Utilitaires (formatage, helpers)
```

## Technologies

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4 + daisyUI
- PrimeReact + PrimeIcons
- Recharts (graphiques), Lucide React (icônes), Motion
- Axios (client HTTP vers le backend Django)