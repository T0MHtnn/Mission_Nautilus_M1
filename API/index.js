import express from 'express';
import { accessLogger, eventLogger } from './utils/logger.js';
import { startTtlCleanup } from './utils/ttl-manager.js';
import gameRouter from './routes/game.js';
import adminRouter from './routes/admin.js';

const app = express();
const PORT = 3000;

app.use(express.json());

// Log d'accès pour chaque requête (Section 2.3)
app.use((req, res, next) => {
	accessLogger.info(`${req.method} ${req.url} - IP: ${req.ip}`);
	next();
});

// --- SECTION 2.1 ---

// 1. Servir les fichiers statiques du répertoire /public sur la route /static
app.use('/static', express.static('public'));

// 2. Rediriger la racine (/) vers la page d'accueil (/static/index.html)
app.get('/', (req, res) => {
	res.redirect('/static/index.html');
});

// Branchement des routes (Partie 2.2)
app.use('/game', gameRouter);
app.use('/admin', adminRouter);

// 3. Middleware de gestion des erreurs 404 (doit être après les routes)
app.use((req, res) => {
	res.status(404).send('<h1>Erreur 404</h1><p>Désolé, cette ressource n\'existe pas sur le serveur Zanzibar.</p>');
});

// --- FIN SECTION 2.1 ---

// Démarrer le nettoyage automatique des objets expirés
startTtlCleanup();

app.listen(PORT, () => {
	eventLogger.info(`Serveur lancé sur http://localhost:${PORT}`);
	console.log(`Serveur lancé sur http://localhost:${PORT}`);
});