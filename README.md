# SpeedArti — Agencement & Découpe — Démo V0.1

Démonstration statique autonome du futur **module métier SpeedArti Agencement & Découpe**.

## Positionnement

Ce module **n'est pas un module de chiffrage**. Il fonctionne comme le module de calpinage : un outil métier autonome qui produit un résultat technique, puis propose plusieurs passerelles vers les fonctions existantes de SpeedArti.

## Fonctionnalités de la démo

- sélection d'un panneau (catalogue démo ; futur raccord à la base Idea Bois) ;
- tableau de débit intuitif ;
- longueur / largeur / quantité ;
- sens du fil / décor et rotation ;
- chants simplifiés ;
- trait de scie configurable ;
- purges gauche / droite / haut / bas ;
- seuils de chutes réutilisables ;
- moteur de placement 2D guillotine multi-stratégies ;
- plans 2D SVG ;
- distinction pièces / purges / déchets / chutes ;
- ordre de coupe indicatif ;
- sauvegarde locale dans le navigateur ;
- quatre connecteurs simulés :
  - Envoyer au chiffrage → Menuisier / Agencement ;
  - Transformer en devis ;
  - Demander un devis fournisseur ;
  - Créer une commande fournisseur.

## Important — sécurité démo

Aucune connexion Supabase, aucun tarif fournisseur temps réel, aucun envoi d'email et aucune donnée de production.

## Mise en ligne GitHub Pages

Le dépôt peut être servi directement depuis la branche `main` et la racine `/` avec GitHub Pages. Aucun build n'est nécessaire.

## Fichiers

- `index.html` : interface ;
- `styles.css` : design responsive ;
- `catalog.js` : données de panneaux de démonstration ;
- `engine.js` : moteur d'optimisation 2D ;
- `app.js` : interactions, plans SVG et connecteurs simulés ;
- `INTEGRATION_SPEEDARTI.md` : raccordements prévus avec SpeedArti production.


## Validation par balises QA

La démo intègre un sixième écran **Validation QA**. Il génère un rapport complet avec les états **BLOQUANT / AVERTISSEMENT / À VALIDER / OK**. La validation manuelle de la démo n’est possible qu’en l’absence de blocage et d’avertissement. Toute modification du module de saisie invalide automatiquement le résultat et la validation précédente.

Voir `BALISES_QA.md` pour la règle complète et `AUDIT_REPORT.md` pour l’audit effectué.

## Tests

Lancer : `node tests/engine.test.js`.

## Vérification QA finale — 04/09/2026
La version QA `2026-09-04.3` a été vérifiée avec tests moteur, DOM et smoke tests Chromium. Sur le scénario nominal après optimisation : **0 BLOQUANT, 0 AVERTISSEMENT, 7 À VALIDER, 57 OK**. Voir `AUDIT_REPORT.md` pour le détail.
