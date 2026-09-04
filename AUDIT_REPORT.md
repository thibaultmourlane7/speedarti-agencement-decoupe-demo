# Audit technique final — Démo SpeedArti Agencement & Découpe

Date : 2026-09-04
Version balises QA : 2026-09-04.3

## Statut après scénario nominal
Après chargement de l'exemple dressing puis optimisation :
- **BLOQUANT : 0**
- **AVERTISSEMENT : 0**
- **À VALIDER : 7**
- **OK : 57**
- statut global : **VALIDABLE POUR DÉMO**

Après clic manuel sur « Valider le module pour démo » : **VALIDÉ POUR DÉMO**.
Toute modification d'une cote ou d'un paramètre annule immédiatement cette validation et repasse le rapport en état à contrôler / bloqué tant qu'un nouveau calcul propre n'a pas été exécuté.

## Balises À VALIDER restantes
1. `CAT-002` — catalogue actuellement de démonstration ; raccord de la vraie BDD Idea Bois à faire.
2. `CONN-002` — connecteurs production volontairement simulés dans la démo.
3. `RESP-001` — test final sur smartphone réel à effectuer avant publication publique.
4. `ATL-004` — kerf et purges réels Idea Bois à confirmer.
5. `DEB-CHANT-001` — chants encore en saisie libre ; structure G/D/H/B à finaliser pour la production.
6. `OUT-002` — export PDF atelier dédié SpeedArti non raccordé ; impression navigateur utilisée en démo.
7. `STOCK-001` — écriture réelle des chutes dans le stock SpeedArti non active en démo.

## Contrôles exécutés
- syntaxe JavaScript : `app.js`, `catalog.js`, `engine.js`, `validation.js`, `tests/engine.test.js` ;
- structure HTML : 58 IDs uniques ;
- correspondance JavaScript/DOM : 58 références ID contrôlées, 0 manquante ;
- présence de tous les assets ;
- absence d'appel réseau/production (`fetch`, XMLHttpRequest, WebSocket, Supabase, axios) ;
- moteur sur l'exemple dressing et les 4 stratégies ;
- ajustement exact sans coupe inutile ;
- protection du kerf ;
- seuils de chute dans les deux orientations ;
- validations défensives prix, seuils, dimensions et quantités ;
- 500 scénarios aléatoires : limites, chevauchements, nombre de pièces, rendement et conservation des surfaces ;
- test UI Chromium : optimisation, plans 2D, rapport QA, validation manuelle, invalidation automatique ;
- test des 4 passerelles : chiffrage, devis client, demande devis fournisseur, commande fournisseur ;
- test accès direct aux sorties sans optimisation : redirection vers QA ;
- test de saisies invalides : nom projet vide, kerf négatif, purges impossibles, repères dupliqués, quantité fractionnaire ;
- test d'une modification de format catalogue : balise AVERTISSEMENT ;
- tests injection HTML/XSS via nom projet et repère pièce : aucune exécution ;
- contrôle responsive automatisé à 390 px : aucun débordement horizontal.

## Problèmes trouvés et corrigés pendant cette vérification
1. **Sauvegarde locale** : un refus d'accès à `localStorage` pouvait interrompre le flux après calcul. L'autosauvegarde est maintenant protégée ; le calcul reste utilisable et le problème remonte comme AVERTISSEMENT d'exécution.
2. **Sécurité HTML** : le nom de projet pouvait être réinjecté directement dans le résumé via `innerHTML`. Les valeurs sont désormais échappées.
3. **Sécurité ordre de coupe** : les repères de pièces présents dans les libellés de coupe sont désormais échappés avant affichage.
4. **Sécurité catalogue futur** : les libellés/identifiants fournisseur du catalogue sont échappés avant insertion dans la liste.
5. **Classification des chutes** : le seuil longueur/largeur est désormais testé dans les deux orientations ; une chute 250 × 400 est reconnue comme équivalente à 400 × 250 pour le critère dimensionnel.
6. **Validation défensive moteur** : prix panneau négatif, seuils de chute négatifs, dimensions invalides et quantités non entières sont maintenant refusés aussi au niveau moteur, pas seulement par l'interface.
7. **Cohérence catalogue** : si les dimensions/épaisseur d'une référence catalogue sont modifiées sans passer sur « Panneau personnalisé », une balise `PAN-005` AVERTISSEMENT apparaît et empêche la validation de la démo tant que l'écart n'est pas traité.

## Résultat automatisé final

```text
OK — engine tests: example + 4 strategies + kerf guards + 500 randomized cases
OK — extra guards: scrap rotation + config + row validation
OK — DOM: 58 IDs uniques, 58 références JS, 0 manquante
Optimisation nominale : 0 BLOQUANT / 0 AVERTISSEMENT / 7 À VALIDER / 57 OK
Plans générés : 2
4 connecteurs : OK
Validation manuelle : OK
Invalidation après modification : OK
XSS projet : 0 exécution
XSS repère : 0 exécution
Mobile 390 px : 390 / 390, aucun débordement
Page errors Chromium : 0
Appels réseau/production : 0
```

## Conclusion
Le périmètre technique de la **démo** est validable. Les 7 balises « À VALIDER » restent volontairement visibles et devront être acceptées pour la démo ou résolues avant le raccord production selon leur nature.
