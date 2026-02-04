import express from 'express';
import { gameState } from '../models/data.js';
import { calculateDistance } from '../utils/geo.js';
import { eventLogger } from '../utils/logger.js';
import { validateToken } from '../utils/auth.js';

const router = express.Router();

/**
 * 1. POST /game/position
 * Mise à jour de la position du joueur
 * Body: { login: string, position: [lat, lon] }
 */
router.post('/position', validateToken, (req, res) => {
	try {
		const { login, position } = req.body;
		
		// Validation
		if (!login || !position || position.length !== 2) {
			return res.status(400).json({ error: "Format invalide. Requis: login et position [lat, lon]" });
		}

		// Initialiser le joueur s'il n'existe pas
		if (!gameState.players[login]) {
			gameState.players[login] = { role: 'explorateur', score: 0, objectsProcessed: 0 };
		}

		gameState.players[login].position = position;
		eventLogger.info(`Joueur ${login} a mis à jour sa position : [${position[0]}, ${position[1]}]`);
		
		res.json({ status: "OK", message: "Position mise à jour" });
	} catch (error) {
		eventLogger.error(`Erreur mise à jour position: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 2. GET /game/resources
 * Récupère la liste des ressources géolocalisées
 * Query: { login: string }
 * 
 * Les explorateurs ne voient que les autres explorateurs + objets
 * Les rivaux voient tout
 * L'admin voit tout
 */
router.get('/resources', validateToken, (req, res) => {
	try {
		const { login } = req.query;
		
		if (!login || !gameState.players[login]) {
			return res.status(404).json({ error: "Joueur non trouvé" });
		}

		const user = gameState.players[login];

		// Filtrer les joueurs visibles
		const visiblePlayers = Object.entries(gameState.players)
			.filter(([name, p]) => {
				// Ne pas renvoyer l'utilisateur lui-même
				if (name === login) return false;
				
				// Les rivaux ne sont pas affichés (sauf pour les autres rivaux et l'admin)
				if (p.role === 'rival' && user.role === 'explorateur') return false;
				
				// Les administrateurs ne sont jamais affichés
				if (p.role === 'admin') return false;
				
				// Doit avoir une position
				return p.position !== undefined;
			})
			.map(([name, p]) => ({
				id: name,
				position: p.position,
				role: p.role,
				score: p.score || 0
			}));

		// Filtrer les objets actifs (TTL > 0)
		const currentTime = Date.now();
		const activeObjects = gameState.objects
			.filter(obj => {
				const elapsed = (currentTime - obj.createdAt) / 1000;
				const remainingTtl = obj.ttl - elapsed;
				return remainingTtl > 0;
			})
			.map(obj => {
				const elapsed = (currentTime - obj.createdAt) / 1000;
				return {
					id: obj.id,
					position: obj.position,
					type: obj.type,
					ttl: Math.max(0, obj.ttl - elapsed)
				};
			});

		eventLogger.info(`${login} a demandé la liste des ressources (${visiblePlayers.length} joueurs, ${activeObjects.length} objets)`);
		
		res.json({
			players: visiblePlayers,
			objects: activeObjects
		});
	} catch (error) {
		eventLogger.error(`Erreur récupération ressources: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 3. POST /game/process-object
 * Traite un objet (doit être à moins de 5m)
 * Body: { login: string, objectId: string }
 */
router.post('/process-object', validateToken, (req, res) => {
	try {
		const { login, objectId } = req.body;
		
		if (!login || !objectId) {
			return res.status(400).json({ error: "Format invalide. Requis: login et objectId" });
		}

		const user = gameState.players[login];
		if (!user || !user.position) {
			return res.status(404).json({ error: "Joueur non trouvé ou sans position" });
		}

		const objIndex = gameState.objects.findIndex(o => o.id === objectId);
		if (objIndex === -1) {
			return res.status(404).json({ error: "Objet non trouvé" });
		}

		const obj = gameState.objects[objIndex];
		const distance = calculateDistance(user.position, obj.position);

		// Vérifier la distance (5m = 0.005 km = 5000m)
		if (distance > 5) {
			eventLogger.warn(`${login} a tenté de traiter ${objectId} à ${distance.toFixed(2)}m (trop loin)`);
			return res.status(403).json({ 
				error: "Objet trop loin", 
				distance: distance.toFixed(2),
				requiredDistance: 5
			});
		}

		// Traiter l'objet
		gameState.objects.splice(objIndex, 1);
		user.score = (user.score || 0) + 1;
		user.objectsProcessed = (user.objectsProcessed || 0) + 1;

		eventLogger.info(`${login} a traité l'objet ${objectId} (${obj.type}) - Score: ${user.score}`);
		
		res.json({
			success: true,
			message: "Objet traité avec succès",
			newScore: user.score,
			objectsProcessed: user.objectsProcessed
		});
	} catch (error) {
		eventLogger.error(`Erreur traitement objet: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 4. POST /game/capture-rival
 * Capture un rival (explorateur seulement, doit être à moins de 5m)
 * Body: { login: string, rivalId: string }
 */
router.post('/capture-rival', validateToken, (req, res) => {
	try {
		const { login, rivalId } = req.body;
		
		if (!login || !rivalId) {
			return res.status(400).json({ error: "Format invalide. Requis: login et rivalId" });
		}

		const user = gameState.players[login];
		if (!user) {
			return res.status(404).json({ error: "Joueur non trouvé" });
		}

		// Seuls les explorateurs peuvent capturer les rivaux
		if (user.role !== 'explorateur') {
			return res.status(403).json({ error: "Seuls les explorateurs peuvent capturer" });
		}

		const rival = gameState.players[rivalId];
		if (!rival || !rival.position) {
			return res.status(404).json({ error: "Rival non trouvé ou sans position" });
		}

		if (rival.role !== 'rival') {
			return res.status(400).json({ error: "La cible n'est pas un rival" });
		}

		// Vérifier la distance
		const distance = calculateDistance(user.position, rival.position);
		if (distance > 5) {
			eventLogger.warn(`${login} a tenté de capturer ${rivalId} à ${distance.toFixed(2)}m (trop loin)`);
			return res.status(403).json({
				error: "Rival trop loin",
				distance: distance.toFixed(2),
				requiredDistance: 5
			});
		}

		// Capturer le rival
		user.score = (user.score || 0) + 10; // Bonus pour capture
		user.rivalsCaptuered = (user.rivalsCaptuered || 0) + 1;

		eventLogger.info(`${login} (explorateur) a capturé le rival ${rivalId} - Nouveau score: ${user.score}`);
		
		res.json({
			success: true,
			message: "Rival capturé avec succès",
			newScore: user.score,
			bonusPoints: 10
		});
	} catch (error) {
		eventLogger.error(`Erreur capture rival: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 5. GET /game/zrr
 * Récupère les limites de la Zone de Recherche et Récupération
 */
router.get('/zrr', validateToken, (req, res) => {
	try {
		const zrr = gameState.zrr;
		
		if (!zrr.limits) {
			return res.json({
				defined: false,
				message: "La ZRR n'a pas encore été définie"
			});
		}

		res.json({
			defined: true,
			limits: zrr.limits
		});
	} catch (error) {
		eventLogger.error(`Erreur récupération ZRR: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

export default router;