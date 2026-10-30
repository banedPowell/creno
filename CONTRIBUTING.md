# Contribuer à Creno

## Le cycle d'une tâche

1. **Issue d'abord.** Tout travail part d'une issue (templates bug, fonctionnalité ou tâche). Elle décrit le besoin et ses critères d'acceptation, porte un label `type:*`, un `priority:*` et un milestone. Une issue trop grosse pour 1 à 3 jours de travail se découpe en plusieurs issues, chacune livrable seule.
2. **Board.** Le [projet Creno](https://github.com/users/banedPowell/projects/3) suit chaque issue : _Backlog_ → _À faire_ → _En cours_ → _En review_ → _Terminé_. On s'assigne l'issue et on la passe en _En cours_ en la commençant, une seule à la fois idéalement. Le champ _Taille_ (XS à XL) aide à repérer ce qui doit être découpé : au-delà de L, on découpe.
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

## Feature flags

Une fonctionnalité qui ne tient pas dans une seule PR est mergée désactivée, puis activée quand elle est prête.

- Les flags sont déclarés dans `shared/utils/features.ts`, désactivés par défaut.
- Côté app : `const enabled = useFeature('myPolls')`, puis `v-if="enabled"`.
- Côté serveur : `requireFeature('myPolls')` en tête de route renvoie 404 tant que le flag est éteint.
- Activation par environnement, sans rebuild : `NUXT_PUBLIC_FEATURES_MY_POLLS=true`.

Un flag ne vit pas indéfiniment : une fois la fonctionnalité activée en production et stable, une PR retire le flag et le code mort.

## Livrer en production

1. Ouvrir une PR `dev` → `main`, titrée par exemple `chore(release): livrer les créneaux exportables`.
2. La merger (merge commit, seule méthode autorisée sur `main`).
3. Le workflow _Release_ lit les commits arrivés depuis le dernier tag, crée le tag `vX.Y.Z` et publie la release. S'il n'y a que des `chore`, `docs`, `ci`…, il ne publie rien.
4. L'hébergeur, branché sur `main`, déploie de lui-même.

On ne livre jamais `main` autrement que depuis `dev`, et on ne commite jamais directement sur `main`.

### Correctif urgent

Pas de raccourci par `main` : un correctif suit le même chemin, simplement sans attendre.

1. Branche `fix/...` depuis `dev`, PR, squash dans `dev`.
2. PR `dev` → `main` aussitôt, merge.

Si `dev` contient des fonctionnalités pas prêtes, elles doivent être derrière un feature flag : c'est ce qui permet de livrer `dev` à tout moment.

## Review

- **Auteur :** relire son propre diff, remplir _Comment tester_, commenter les passages délicats.
- **Relecteur :** correction et sécurité d'abord, puis conception, puis lisibilité ; le style est l'affaire du linter. Préfixer les remarques : `bloquant:`, `suggestion:`, `question:`, `nit:`.
- Toutes les conversations doivent être résolues avant le merge.

## Automatisations

| Workflow                   | Déclencheur              | Rôle                                                   |
| -------------------------- | ------------------------ | ------------------------------------------------------ |
| `ci.yml`                   | PR, push `main`          | format, lint, typecheck, tests, build                  |
| `pr.yml`                   | PR                       | vérifie le titre, pose les labels `type:*` et `area:*` |
| `release.yml`              | push `main`              | tag `vX.Y.Z` et release avec notes groupées par label  |
| `dependabot-automerge.yml` | PR Dependabot            | merge auto des mises à jour mineures et correctives    |

## Branches protégées

- `dev` : PR obligatoire, checks _Check_ et _PR title_ verts, conversations résolues, squash uniquement.
- `main` : PR obligatoire depuis `dev`, check _Check_ vert, merge commit uniquement.
