# 1.1. Utilisation manuelle des DevTools

**Question 1 :**<br>
*FCP :* 567.4 ms
*LCP :* 917.3 ms
*CRP :* Comme le LCP est l'indicateur visuel de la fin du CRP, alors c'est également 917.3 ms

**Question 2 :**<br>
On n'avais pas accès à la fast 3G, on a donc fait avec le mode 3G simple.

*FCP :* 51,988.5 ms
*LCP :* 85,670.5 ms
*CRP :* 85,670.5 ms

*On peut voir une explosion des délais :*<br>
 Le passage en 3G a multiplié les temps de chargement par environ 90. Ce n'est plus une simple attente, c'est un blocage complet de l'expérience utilisateur.

*Le poids de la latence :*<br>
 En regardant la vue en "cascade", on remarque que chaque requête (HTML, CSS, puis JS) subit un délai de latence (TTFB) énorme avant même que le téléchargement ne commence.

*Saturation du débit :*<br>
 Les barres bleues dans l'onglet Network montrent que le transfert du bundle JavaScript (index.js) accapare toute la bande passante. Tant que ce fichier n'est pas intégralement reçu, le CRP est gelé : le navigateur ne peut pas exécuter Vue, donc il ne peut pas calculer le layout, ni afficher la carte.

**Question 3 :**<br>
Le combo Vue.js / Vite limite l'impact de la latence et du faible débit en 3G via plusieurs mécanismes d'optimisation :

* Bundling (Regroupement) : Vite regroupe des centaines de fichiers sources en un nombre très restreint de "chunks". Sur un réseau lent, cela évite de multiplier les requêtes HTTP (chaque requête subissant une forte latence).

* Minification : Le bundler supprime tout le code inutile (espaces, commentaires) et renomme les variables pour réduire le poids des fichiers au strict minimum. Moins d'octets à transférer signifie un LCP plus rapide.

* Tree Shaking : Seul le code réellement utilisé par l'application est inclus dans le bundle final, évitant de charger des pans entiers de bibliothèques inutilisés.

* Gestion des ressources : Vite génère des liens optimisés vers le CSS et les scripts (balises module), permettant au navigateur de commencer à traiter le code avant même que le téléchargement complet de tous les fichiers ne soit fini.
