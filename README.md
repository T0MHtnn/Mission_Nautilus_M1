# **Zanzibar API**
### Serveur de jeu de piste géolocalisé développé en Node.js avec Express. Il gère la logique métier, la sécurité via un backoffice Java et la persistance de l'état du jeu en mémoire.


**Installation**


 1 -Extraire l'archive.

 2 - Installer les dépendances :
    npm install

**Lancement**


 1 - Démarrer le serveur d'authentification Java fourni :
    java -jar users.jar

 2 - Démarrer le serveur Node.js (lance automatiquement ESLint) :
    npm start



**Fonctionnalités Implémentées**

*Sécurité & Authentification*
 - Validation Backoffice : Chaque requête est validée auprès du serveur Java via GET /authenticate avec vérification de l'origine.

 - Gestion des Rôles : Accès restreint aux routes /admin (rôle admin) et gestion des types explorer / rival.


*Logique Spatiale*

 - ZRR (Zone à Régime Restreint) : Définition d'un périmètre rectangulaire. Alerte dynamique dans la réponse JSON si un joueur sort de la zone.

 - Radar & Floutage :

   - Filtre de proximité (500m) pour les ressources.

   - Floutage des positions des objets pour les explorateurs.

   - Positions réelles pour les rivaux.


*Gameplay*

 - Collecte : Système de score pour les explorateurs lors du ramassage d'artefacts.

 - Menaces : Détection des "créatures féroces". Élimination immédiate (status 403) si un joueur approche à moins de 5m.

 - Alertes : Notification si un rival se trouve à moins de 25m d'un objet.

 - Persistance : Gestion du TTL (Time To Live) sur les objets créés par l'administrateur.


**Structure du Projet**


 - index.js : Point d'entrée et configuration Express.

 - routes/ : Définition des endpoints admin et game.

 - models/ : Contient la définition des structures de données et l'état global du jeu (`gameState`).

 - utils/ : Fonctions utilitaires, incluant la logique de calcul de distance, les middlewares d'authentification (`auth.js`) et
            le logger.

 - public/ : Dossier destiné aux ressources statiques (préparation pour le TP3).

 - log/ : Fichiers de logs techniques et métier.


## **Tests Unitaires (TP3)**


L'API a été testée en utilisant **Jasmine**. Les tests couvrent les points suivants :

### **Côté API (Serveur)**
  * Utilisation de Jasmine en mode ES Modules.

  * Tests de la logique métier exportée dans src/logic.js.

  * Validation des règles de gestion de la ZRR et du TTL.

### **Côté Admin (Client)**
  * Tests des utilitaires de conversion de données.

  * Vérification de la récupération des bounds de la carte.


## **Pour lancer les tests localement :**

1. ```cd API && npm test```
2. ```cd admin && npm test```




Lancer :
API node : npm start                                              -> cd /Web_avancee/API
Front admin : npm run serve                                       -> cd /Web_avancee/admin
Front client : npm run dev                                        -> cd /Web_avancee/client
JAR : java -jar users.jar --app.origin=http://localhost:5173      -> cd /Web_avancee
Swagger : http://localhost:8080/swagger-ui/index.html

**********************
SwaggerVM : https://192.168.75.88:8443/swagger-ui/index.html
AdminVM: https://192.168.75.88/secret/login.html
Client Rivaux: https://192.168.75.88/
Client Explorateurs: https://192.168.75.88/v2
