# Creno

Application Nuxt 4 pour organiser des sondages de créneaux : on propose des plages horaires, les participants indiquent leurs disponibilités.

Stack : Nuxt 4 · Nuxt UI · Drizzle ORM + Turso (libSQL) · Vitest.

## Prérequis

- Node.js 22 (voir `.nvmrc`)
- pnpm (version fixée par `packageManager`, activable via `corepack enable`)
- Une base Turso pour le développement fullstack

## Installation

```bash
pnpm install
cp .env.example .env   # puis renseigner TURSO_DATABASE_URL et TURSO_AUTH_TOKEN
```

`pnpm install` installe aussi les hooks Git (voir plus bas).

## Scripts

| Commande                 | Rôle                                                         |
| ------------------------ | ------------------------------------------------------------ |
| `pnpm dev`               | Serveur de développement                                     |
| `pnpm dev:fullstack`     | Installe, migre la base et lance le dev en HTTPS sur le LAN  |
| `pnpm build`             | Build de production                                          |
| `pnpm test`              | Tests en mode watch (`test:server`, `test:app` pour cibler)  |
| `pnpm check`             | Format, lint, typecheck et tests : identique à la CI         |
| `pnpm fix`               | Corrige automatiquement le format et le lint                 |
| `pnpm drizzle:generate`  | Génère une migration depuis `server/db/schema.ts`            |
| `pnpm drizzle:migrate`   | Applique les migrations                                      |
| `pnpm drizzle:studio`    | Explorateur de base                                          |

## Workflow Git

- `main` : production. `dev` : intégration. Les deux sont protégées (PR obligatoire, CI verte, pas de force push).
- Une issue, puis une branche depuis `dev` : `feat/...`, `fix/...`, `chore/...`, puis PR squashée vers `dev`.
- `dev` est fusionnée dans `main` par PR pour livrer : une release versionnée est publiée automatiquement.
- Messages de commit et titres de PR au format [Conventional Commits](https://www.conventionalcommits.org/) (`feat: ...`, `fix: ...`), vérifiés par commitlint et en CI.

La méthode complète (issues, PR, review, feature flags, release) est dans [CONTRIBUTING.md](CONTRIBUTING.md).

### Hooks Git

- **pre-commit** : ESLint et Prettier sur les fichiers indexés (lint-staged).
- **commit-msg** : validation Conventional Commits.

### CI

GitHub Actions (`.github/workflows/ci.yml`) exécute format, lint, typecheck, tests et build sur chaque PR et chaque push sur `main`/`dev`. Dependabot propose chaque semaine les mises à jour de dépendances vers `dev`, et les mineures sont fusionnées automatiquement une fois la CI verte.

## Éditeur

Les réglages VS Code recommandés sont dans `.vscode/` (formatage à l'enregistrement, ESLint). `.editorconfig` et `.gitattributes` garantissent tabulations et fins de ligne LF sur tous les OS.

## Feature flags

Les fonctionnalités inachevées sont mergées désactivées et s'activent par environnement, sans rebuild :

```bash
NUXT_PUBLIC_FEATURES_MY_POLLS=true
```

Déclaration dans `shared/utils/features.ts`, lecture avec `useFeature('myPolls')` côté app et `requireFeature('myPolls')` côté serveur. Voir [CONTRIBUTING.md](CONTRIBUTING.md#feature-flags).
