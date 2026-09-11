# MediCare Connect

Système intégré de gestion médicale : patients, rendez-vous, consultations, prescriptions, laboratoire, pharmacie et facturation.

## Fonctionnalités

- Gestion des patients et des dossiers médicaux
- Prise de rendez-vous et calendrier
- Consultations et historique médical
- Prescriptions électroniques
- Suivi de laboratoire
- Gestion de pharmacie
- Facturation et paiements

## Installation

**Prérequis :** Node.js

1. Installer les dépendances :
   ```bash
   npm install
   ```

2. Configurer les variables d'environnement :
   ```bash
   cp .env.example .env.local
   ```

3. Démarrer l'application :
   ```bash
   npm run dev
   ```

## Structure du projet

```
src/
├── components/     # Composants React
├── pages/         # Pages de l'application
├── services/      # Services API
├── types/         # Types TypeScript
└── utils/         # Utilitaires
```

## Technologies

- React 19
- TypeScript
- Tailwind CSS
- Vite
- Lucide React (icônes)
