# 1.2.2. API User Timing

Ce document répertorie les métriques personnalisées définies pour mesurer les performances de la logique métier de l'application.

## Métrique 1 : Traitement Logique Jeu (Global)
- **Description** : Mesure le temps total de traitement des données reçues par les trois appels API simultanés (Positions, Ressources, ZRR). Cela inclut le parsing JSON et la mise à jour de l'état global du store.
- **Obtention** : Encapsulation du bloc de traitement dans la fonction `updateGameState` (`stores/game.ts`) entre deux marques de performance.
- **Valeur initiale** : 4.300 ms

## Métrique 2 : Synchronisation Ressources (Focus)
- **Description** : Mesure spécifiquement le temps de calcul nécessaire pour filtrer, mapper et mettre à jour la liste des objets (actifs et découverts) du jeu.
- **Obtention** : Placée à l'intérieur du bloc `if (resRes.ok)` dans `updateGameState`.
- **Valeur initiale** : 0.100 ms

---
*Ces mesures servent de base de référence (baseline) avant les optimisations liées au filtrage des Rivaux et à l'ajout des animations de bulles.*