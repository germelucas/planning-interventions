# Planning d'interventions

Application full-stack de gestion d'interventions construite avec React, Vite,
Node.js, Express et PostgreSQL. Elle permet de gérer des clients, des
intervenantes et leurs prestations depuis un planning visuel en vues jour,
semaine et mois.

## Un projet créé avec l'IA, supervisé par son auteur

Ce projet a été réalisé dans un workflow de développement fortement assisté par
IA. Lucas Germe a défini le besoin, cadré les fonctionnalités, guidé les agents
de développement et gardé la responsabilité de chaque livraison : contrôle des
changements, reproduction des bugs, arbitrages fonctionnels, exécution des
tests et validation du build.

L'IA a accéléré l'exploration et l'écriture du code. La direction du produit,
les décisions, les vérifications et la mise en production sont restées sous
supervision humaine. Le dépôt conserve une architecture lisible afin que les
choix techniques et le trajet des données puissent être expliqués et maintenus.

## Fonctionnalités

- vues jour, semaine et mois avec navigation par période ;
- création d'une intervention depuis le planning ou le menu contextuel ;
- modification, suppression, glisser-déposer et redimensionnement ;
- affichage en colonnes des interventions simultanées ;
- filtres par client et par intervenante ;
- création et gestion des clients et intervenantes ;
- validation des dates et prévention des chevauchements ;
- persistance PostgreSQL et déploiement serverless sur Vercel ;
- tests automatisés de l'API et des calculs du calendrier.

Ce dépôt est volontairement organisé comme un monorepo simple. Il montre une
séparation claire des responsabilités sans ajouter de microservices ou de
couches techniques inutiles pour la taille du projet.

## Architecture

```text
api/                       Entrée serverless utilisée au déploiement
src/
├── components/            Vues et formulaires React
├── services/api.js        Communication HTTP avec le backend
├── utils/                 Dates et règles d'affichage du calendrier
└── App.jsx                État global et orchestration de l'interface
server/
├── routes/                Déclaration des URLs et méthodes HTTP
├── controllers/           Lecture des requêtes et création des réponses HTTP
├── services/              Cas d'utilisation et règles métier
├── repositories/          Requêtes SQL et accès aux données
├── validators/            Validation syntaxique des données
├── errors/                Erreurs HTTP partagées
├── database.js            Connexion PostgreSQL
├── app.js                 Assemblage de l'application Express
└── index.js               Démarrage du serveur
test/                      Tests de l'API et des algorithmes
supabase/migrations/       Schéma et migrations PostgreSQL
```

Lorsqu'un utilisateur déplace une intervention, l'action suit ce trajet :

```text
Composant React → service API → route → controller → service → repository → PostgreSQL
```

`App.jsx` conserve l'état principal. Les composants affichent cet état et
remontent les actions de l'utilisateur. Le service API masque les détails de
`fetch`. Côté backend, le controller traduit HTTP, le service applique les
règles métier et le repository est la seule couche qui exécute du SQL.

## Configuration

Créer un fichier `.env` à la racine :

```dotenv
DATABASE_URL=postgresql://utilisateur:mot_de_passe@localhost:5432/planning
DB_POOL_SIZE=5
PORT=8000
NODE_ENV=development
```

- `DATABASE_URL` est obligatoire et désigne la base PostgreSQL.
- `DB_POOL_SIZE` fixe le nombre maximal de connexions, avec `5` par défaut.
- `PORT` choisit le port du serveur Express, avec `8000` par défaut.
- `NODE_ENV=production` demande à Express de servir le frontend compilé.

Les migrations nécessaires se trouvent dans `supabase/migrations`.

## Développement

```powershell
npm install
npm run dev
```

Le frontend est disponible sur `http://localhost:5173` et utilise l'API Express
lancée en parallèle.

## Production

```powershell
npm run build
$env:NODE_ENV="production"
npm start
```

Ouvrir `http://127.0.0.1:8000`.

## Tests

```powershell
npm test
```

Les tests API utilisent une base PostgreSQL en mémoire. Les tests unitaires
contrôlent également les calculs de dates et le placement des interventions qui
se chevauchent.

## Routes publiques

- `GET/POST /api/clients`
- `GET/POST /api/employees`
- `GET/POST /api/interventions`
- `PATCH/DELETE /api/interventions/:id`

Les noms de propriétés JSON restent en camelCase, par exemple `clientId`,
`employeeId`, `startAt` et `endAt`.
