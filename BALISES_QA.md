# SpeedArti — Règle des balises QA

## Objectif
Les balises ne sont pas de simples alertes utilisateur. Elles constituent le contrôle qualité du module avant publication d'une démo puis avant raccord à la production.

Chaque contrôle possède un identifiant stable, un domaine, un état, un libellé et un détail.

## États
- **BLOQUANT** : empêche le calcul, une sortie ou la validation de la démo.
- **AVERTISSEMENT** : anomalie non bloquante mais à corriger avant validation.
- **À VALIDER** : limite connue ou paramètre à confirmer manuellement. Peut être accepté explicitement pour une démo, mais doit être traité avant production si nécessaire.
- **OK** : contrôle passé.

## Statut global
- **BLOQUÉ** : au moins une balise BLOQUANTE.
- **À CONTRÔLER** : aucun blocage mais au moins un AVERTISSEMENT.
- **VALIDABLE POUR DÉMO** : aucun blocage ni avertissement ; les éventuelles balises À VALIDER restent visibles.
- **VALIDÉ POUR DÉMO** : validation manuelle effectuée après un rapport propre.

## Règle d'invalidation
Toute modification d'une donnée du projet, du panneau, des pièces, des paramètres atelier ou de la stratégie invalide le résultat calculé. Une validation manuelle précédente est automatiquement annulée si l'empreinte QA change.

## Domaines contrôlés
Structure du module, catalogue, projet, panneau, paramètres atelier, liste de débit, sens du fil, dimensions, quantités, possibilité de débit, optimisation, conservation du nombre de pièces, conservation des surfaces, limites géométriques, chevauchements, traits de coupe, plans 2D, chutes, connecteurs SpeedArti, erreurs JavaScript d'exécution et limites connues de la démo.

## Validation manuelle
Le bouton **Valider le module pour démo** est désactivé tant qu'une balise BLOQUANTE ou AVERTISSEMENT existe. Les balises À VALIDER sont présentées explicitement afin que Thibault puisse les accepter pour le périmètre démo en connaissance de cause.
