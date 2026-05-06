# 1.3. Rapport Lighthouse Initial (v0)

**Score Global de Performance :** 48/100

## Analyse des métriques

1. **Score de Performance (Global)**
   - *Observation :* Mon score est de 48/100. Un score inférieur à 50 indique des problèmes de performance sérieux selon le barème Lighthouse.
   - *Piste :* Ce score étant une moyenne pondérée, son amélioration dépend de la résolution des points bloquants listés ci-dessous (FCP, LCP et poids du JS).

2. **First Contentful Paint (FCP) : 21.1s**
   - *Observation :* Le score est critique. L'utilisateur attend plus de 20 secondes avant de voir le moindre élément, ce qui est dû au téléchargement du bundle JavaScript initial massif qui bloque le rendu.
   - *Piste :* Mettre en place du code-splitting pour ne charger que le nécessaire au démarrage et vérifier que les scripts utilisent bien l'attribut `defer`.

3. **Largest Contentful Paint (LCP) : 27.6s**
   - *Observation :* Le délai est extrêmement long. Cela correspond au moment où la carte Leaflet et ses composants lourds sont enfin affichés après l'exécution complète du bundle Vue.
   - *Piste :* Optimiser le chargement des dépendances lourdes et s'assurer que le serveur Nginx utilise la compression (Gzip/Brotli) pour réduire le temps de transfert.

4. **Cumulative Layout Shift (CLS) : 0**
   - *Observation :* Score parfait. La page est stable visuellement et les éléments ne subissent aucun décalage inattendu pendant le chargement.
   - *Piste :* Maintenir ce score en continuant de spécifier des dimensions fixes pour les futurs conteneurs (comme le canvas des bulles).

5. **Total Blocking Time (TBT) : 310ms**
   - *Observation :* C'est le point positif de l'audit. Malgré un chargement réseau lent, une fois le code exécuté, le thread principal n'est pas "gelé" par de trop longues tâches.
   - *Piste :* Surveiller cette métrique lors de l'ajout des futurs traitements (Web Workers) pour garder une interface fluide.

6. **Opportunité : "Redimensionner correctement les images"**
   - *Observation :* L'audit détecte un gain potentiel de 112 KiB. Des images (icônes/marqueurs) sont probablement chargées dans une résolution supérieure à leur taille d'affichage.
   - *Piste :* Redimensionner les assets à leur taille réelle d'utilisation et utiliser des formats modernes comme le `.webp`.

7. **Opportunité : "Différer les images non visibles" (Lazy Loading)**
   - *Observation :* Des ressources hors-champ sont téléchargées immédiatement, ce qui consomme de la bande passante inutilement en 3G.
   - *Piste :* Ajouter l'attribut `loading="lazy"` sur les balises `<img>` des composants qui ne sont pas visibles dès le chargement initial.

8. **Opportunité : "Supprimer les ressources CSS/JavaScript inutilisées"**
   - *Observation :* Lighthouse estime une perte de 1,2 Mo (code chargé mais jamais exécuté). Cela s'explique par un bundle monolithique incluant toutes les librairies (Leaflet, etc.).
   - *Piste :* Implémenter le "code-splitting" via des imports dynamiques dans le router pour ne charger les librairies de la carte que sur la vue concernée.

9. **Diagnostic : "Minimiser le travail du thread principal"**
   - *Observation :* Le thread principal est occupé pendant 6,5s, majoritairement par l'évaluation des scripts (2,3s) et le parsing du code.
   - *Piste :* Simplifier la hiérarchie des composants Vue et optimiser les fonctions de boucle dans le store Pinia.

10. **Bonus : Score d'Accessibilité**
   - *Observation :* Le score est à surveiller. Les diagnostics indiquent des besoins d'optimisation sur les contrastes et les balises sémantiques.
   - *Piste :* Ajouter des attributs `alt` descriptifs aux images et utiliser des balises HTML sémantiques (`<nav>`, `<main>`, `<button>`) pour faciliter la navigation clavier/lecteur d'écran.

---

## Diagnostics Supplémentaires (Points critiques)

- **Minification du JavaScript** : Gain estimé de **2,9 Mo**. Le code n'est pas compressé, ce qui alourdit considérablement le transfert.
- **Poids total du réseau** : La charge utile totale est de **4,2 Mo**. C'est un poids excessif pour une application mobile, expliquant l'échec de l'audit en mode 3G.