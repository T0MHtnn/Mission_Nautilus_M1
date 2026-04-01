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
		const { position } = req.body;
		const login = req.user.login;

		// Validation
		if (!login || !position || position.length !== 2) {
			return res.status(400).json({ error: "Format invalide. Requis: login et position [lat, lon]" });
		}

		// Initialiser le joueur s'il n'existe pas
		if (!gameState.players[login]) {
			gameState.players[login] = {
				role: req.user.role.toLowerCase(),
				score: 0,
				objectsProcessed: 0
			};
		}

		gameState.players[login].position = position;
		eventLogger.info(`Joueur ${login} a mis à jour sa position : [${position[0]}, ${position[1]}]`);

		let responseMessage = "Position mise à jour";

		if (gameState.zrr.limits) {
			const inside = isInsideZRR(position, gameState.zrr.limits);
			if (!inside) {
				// Ajout d'un flag dans l'objet joueur pour indiquer qu'il est hors zone
				gameState.players[login].isOutOfZone = true;
				eventLogger.warn(`Joueur ${login} est SORTI de la ZRR !`);
				responseMessage += " (Attention : vous êtes hors de la zone de jeu !)";
			} else {
				gameState.players[login].isOutOfZone = false;
			}
		}

		gameState.objects.forEach(obj => {
			if (obj.type === 'creature' && calculateDistance(position, obj.position) < 5) {
				gameState.players[login].isDead = true;
				eventLogger.warn(`${login} a été dévoré par une créature !`);
			}
		});

		if (gameState.players[login].isDead) {
			return res.status(403).json({ error: "Vous avez été éliminé (dévoré)" });
		}

		res.json({ status: "OK", message: responseMessage });
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
		const login = req.user.login;
		const role = req.user.role;
		let user = gameState.players[login];

		if (!user) {
			if (role === 'admin' || role === 'administrator') {
				user = { role: 'admin', position: [45.782, 4.8656] };
			} else {
				return res.status(404).json({ error: "Joueur non trouvé" });
			}
		}

		// Filtrer les joueurs visibles
		const visiblePlayers = Object.entries(gameState.players)
			.filter(([name, p]) => {
				if (p.role === 'admin' || p.role === 'administrator') return false;

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
		let alerts = [];

		const activeObjects = gameState.objects
			.filter(obj => {
				const elapsed = (currentTime - obj.createdAt) / 1000;
				const remainingTtl = obj.ttl - elapsed;
				// const distance = calculateDistance(user.position, obj.position);
				// return remainingTtl > 0 && distance < 500;
				return remainingTtl > 0;			// POUR LE MOMENT ON CHECK JUSTE SI L'OBJET S'AFFICHE
			})
			.map(obj => {
				const elapsed = (currentTime - obj.createdAt) / 1000;
				let finalPosition = obj.position;

				//Position floue pour les explorateurs
				if (user.role === 'explorateur') {
					const dist = Math.random() * 0.0001;
					const angle = Math.random() * 2 * Math.PI;
					finalPosition = [
						obj.position[0] + Math.cos(angle) * dist,
						obj.position[1] + Math.sin(angle) * dist
					];

					//Alerte si un rival est proche d'un objet (25m)
					Object.values(gameState.players).forEach(p => {
						if (p.role === 'rival' && p.position) {
							if (calculateDistance(p.position, obj.position) < 25) {
								alerts.push("Alerte : Un rival rôde près d'une ressource !");
							}
						}
					});
				}

				return {
					id: obj.id,
					position: finalPosition,
					type: obj.type,
					ttl: Math.max(0, obj.ttl - elapsed)
				};
			});

		eventLogger.info(`${login} a demandé la liste des ressources (${visiblePlayers.length} joueurs, ${activeObjects.length} objets)`);

		//Préparer la liste des objets déjà traités
		const processedObjectsList = gameState.processedObjects.map(obj => ({
			id: obj.id,
			position: obj.position,
			type: obj.type,
			status: "processed",
			by: obj.processedBy
		}));

		res.json({
			players: visiblePlayers,
			objects: activeObjects,
			processedObjects: processedObjectsList,
			alerts: [...new Set(alerts)]
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
		const { objectId } = req.body;
		const login = req.user.login;
		const user = gameState.players[login];

		console.log(`🎯 [PROCESS] Tentative par ${login} sur l'objet ${objectId}`);

		if (!objectId) {
			return res.status(400).json({ error: "Format invalide. Requis: objectId" });
		}

		// Initialiser le joueur s'il n'existe pas encore dans le gameState
		if (!gameState.players[login]) {
			gameState.players[login] = {
				role: req.user.role.toLowerCase(),
				score: 0,
				objectsProcessed: 0
			};
		} else {
			gameState.players[login].role = req.user.role.toLowerCase();
		}


		// Vérifier si le joueur a une position pour calculer la distance
		if (!user.position) {
			return res.status(400).json({ error: "Position du joueur inconnue. Envoyez votre position d'abord." });
		}

		const maxDistance = (user.role === 'explorateur') ? 10 : 5;

		const objIndex = gameState.objects.findIndex(o => o.id === objectId);
		if (objIndex === -1) {
			return res.status(404).json({ error: "Objet non trouvé ou expiré" });
		}

		const obj = gameState.objects[objIndex];
		const distance = calculateDistance(user.position, obj.position);

		console.log(`📏 [PROCESS] Distance calculée: ${distance.toFixed(2)}m`);

		// Vérifier la distance
		if (distance > maxDistance) {
			eventLogger.warn(`${login} a tenté de traiter ${objectId} à ${distance.toFixed(2)}m (trop loin)`);
			return res.status(403).json({
				error: "Trop loin pour collecter",
				distance: distance.toFixed(2),
				maxAutorisee: maxDistance
			});
		}

		// Traiter l'objet
		const [processedObj] = gameState.objects.splice(objIndex, 1);
		gameState.processedObjects.push({
			...processedObj,
			processedBy: login,
			processedAt: Date.now()
		});

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
		const { rivalId } = req.body;
		const login = req.user.login;

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
 * Récupère les limites de la Zone de Recherche et Récupération (ZRR)
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
			limits: {
				so: [zrr.limits.se[0], zrr.limits.no[1]],
				ne: [zrr.limits.no[0], zrr.limits.se[1]]
			}
		});
	} catch (error) {
		eventLogger.error(`Erreur récupération ZRR: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * Fonction utilitaire pour vérifier si une position est à l'intérieur des limites de la ZRR
 * @param {*} position 
 * @param {*} zrrLimits 
 * @returns 
 */
const isInsideZRR = (position, zrrLimits) => {
	// Si pas de ZRR, on considère qu'il est "dedans" par défaut
	if (!zrrLimits) {
		return true;
	}

	const [lat, lon] = position;
	const { no, se } = zrrLimits;

	return (
		lat <= no[0] && lat >= se[0] &&
		lon >= no[1] && lon <= se[1]
	);
};

export default router;