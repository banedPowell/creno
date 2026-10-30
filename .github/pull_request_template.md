<!-- Titre : au format Conventional Commits, il devient le message du commit squashé.
     ex. « feat(calendar): déplacer un créneau au clavier » -->

Closes #

## Quoi

<!-- Ce que change cette PR, en une ou deux phrases. -->

## Pourquoi

<!-- Le problème résolu ou la fonctionnalité apportée, si l'issue ne suffit pas. -->

## Comment tester

1.

## Vérification

- [ ] `pnpm check` passe en local
- [ ] Testé dans le navigateur si l'UI change (clair, sombre, mobile)
- [ ] Migration générée si `server/db/schema.ts` change
- [ ] Derrière un feature flag si la fonctionnalité n'est pas terminée
