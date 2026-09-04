# Raccordement production SpeedArti

## 1. Principe

Le projet **Agencement & Découpe** reste la source technique. Les autres modules reçoivent un export / brouillon ; ils ne dupliquent pas le moteur de découpe.

## 2. Demande de devis fournisseur

Réutiliser l'existant :

- `demandes_devis_fournisseurs` pour l'entête ;
- `demandes_devis_lignes` pour les articles / prestations ;
- `reponses_devis_fournisseurs` pour les réponses ;
- bucket privé `devis-fournisseurs` pour les documents.

À transmettre depuis le configurateur :

- nom/référence du projet ;
- fournisseur ciblé ;
- référence panneau, famille, décor, épaisseur, format ;
- nombre de panneaux calculé ;
- liste de débit complète ;
- dimensions finies et dimensions de débit ;
- sens du fil / rotation ;
- chants ;
- perçages/rainures/usinages lorsqu'ils seront activés ;
- plan(s) 2D PDF ;
- notes atelier.

## 3. Commande fournisseur

Réutiliser `commandes_fournisseurs`.

Règle :

- si un devis fournisseur a été reçu et validé, reprendre ses prix et conditions ;
- sinon créer un brouillon avec une alerte « prix fournisseur non validé » ;
- conserver le lien avec le projet Agencement & Découpe et, si présent, le chantier.

Le suivi existant des commandes en retard doit rester actif.

## 4. Dualité fournisseur à normaliser

L'architecture actuelle comporte `fournisseurs` et `fournisseurs_marketplace`. Il ne faut pas créer une troisième notion de fournisseur pour ce module.

Prévoir un identifiant / pont unique permettant à Idea Bois ou tout autre fournisseur d'être retrouvé par : catalogue, demande de devis, réponse et commande.

## 5. Chiffrage

Bouton **Envoyer au chiffrage** : cible `Menuisier / Agencement`.

Données minimales :

- panneaux complets nécessaires ;
- surface / quantité ;
- nombre de pièces ;
- longueur totale de chants ;
- usinages ;
- temps atelier estimé lorsqu'il sera disponible.

Si le projet technique est modifié après le transfert : afficher « Projet de découpe modifié depuis le dernier transfert » et proposer **Mettre à jour le chiffrage**. Ne pas mettre à jour automatiquement.

## 6. Devis client

Bouton **Transformer en devis** : créer un brouillon de devis client dans le système existant.

Lignes possibles :

- fourniture panneaux ;
- débit / découpe ;
- placage de chants ;
- usinages ;
- livraison ;
- pose / assemblage si ajoutés depuis le chiffrage.

Le devis reste modifiable avant validation.

## 7. Stock de chutes — évolution

Chaque chute conservée pourra devenir un article de stock lié à :

- fournisseur / référence matériau ;
- décor ;
- épaisseur ;
- longueur / largeur ;
- sens du fil ;
- projet d'origine ;
- emplacement ;
- identifiant / QR code futur.

Le prochain calcul devra tester les chutes compatibles avant d'ouvrir un panneau neuf.
