# Contribuer à Creno

## Le cycle d'une tâche

1. **Issue d'abord.** Tout travail part d'une issue (templates bug, fonctionnalité ou tâche). Elle décrit le besoin et ses critères d'acceptation, porte un label `type:*`, un `priority:*` et un milestone. Une issue trop grosse pour 1 à 3 jours de travail se découpe en plusieurs issues, chacune livrable seule.
2. **Board.** L'issue passe dans la colonne _En cours_ du projet GitHub quand on la commence. Une seule à la fois, idéalement.
3. **Branche.** Depuis `dev` à jour : `feat/28-mes-crenos`, `fix/20-validation-creation`, `chore/...`. Une branche par issue, de courte durée.
4. **PR tôt, en brouillon.** Dès le premier commit significatif. La CI tourne, le travail est visible. Le corps contient `Closes #<numéro>` pour que l'issue se ferme au merge.
5. **Prête pour review** quand les critères sont remplis, `pnpm check` passe et le diff a été relu sur GitHub.
6. **Squash merge dans `dev`.** Le titre de la PR devient l'unique commit : il doit suivre [Conventional Commits](https://www.conventionalcommits.org/), ce que vérifie le check _PR title_.
7. **Livraison.** Une PR `dev` → `main` (merge commit) livre en production. Le workflow _Release_ calcule la version et publie la release.

## Taille des PR

Visez moins de 400 lignes modifiées et un seul sujet. Un refactor croisé en chemin fait l'objet de sa propre PR. Une fonctionnalité longue se livre en plusieurs PR derrière un feature flag.

## Titres et commits

| Préfixe                          | Effet sur la version | Label posé      |
| -------------------------------- | -------------------- | --------------- |
| `feat:`                          | mineure              | `type:feature`  |
| `fix:` / `perf:`                 | patch                | `type:bug` / `type:perf` |
| `feat!:` ou `BREAKING CHANGE:`   | majeure (mineure avant 1.0) | —        |
| `chore:` `ci:` `docs:` `refactor:` `test:` `style:` `build:` | aucune | selon le type |

Le sujet commence par une minuscule et dit ce que le changement apporte : `feat(calendar): déplacer un créneau au clavier`. Les labels `area:*` sont posés d'après les fichiers modifiés (`.github/labeler.yml`).

## Review

- **Auteur :** relire son propre diff, remplir _Comment tester_, commenter les passages délicats.
- **Relecteur :** correction et sécurité d'abord, puis conception, puis lisibilité ; le style est l'affaire du linter. Préfixer les remarques : `bloquant:`, `suggestion:`, `question:`, `nit:`.
- Toutes les conversations doivent être résolues avant le merge.

## Automatisations

| Workflow                   | Déclencheur              | Rôle                                                   |
| -------------------------- | ------------------------ | ------------------------------------------------------ |
| `ci.yml`                   | PR, push `dev`/`main`    | format, lint, typecheck, tests, build                  |
| `pr.yml`                   | PR                       | vérifie le titre, pose les labels `type:*` et `area:*` |
| `release.yml`              | push `main`              | tag `vX.Y.Z` et release avec notes groupées par label  |
| `dependabot-automerge.yml` | PR Dependabot            | merge auto des mises à jour mineures et correctives    |

## Branches protégées

- `dev` : PR obligatoire, checks _Check_ et _PR title_ verts, conversations résolues, squash uniquement.
- `main` : PR obligatoire depuis `dev`, check _Check_ vert, merge commit uniquement.
