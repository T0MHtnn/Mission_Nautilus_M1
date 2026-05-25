import express from 'express';
import { gameState } from '../models/data.js';
import { calculateDistance } from '../utils/geo.js';
import { eventLogger } from '../utils/logger.js';
import { validateToken } from '../utils/auth.js';

const router = express.Router();

/**
 * Helper interne pour valider un joueur
 */
const getActivePlayer = (login) => {
	const player = gameState.players[login];
	if (!player) return { error: "Joueur inconnu", status: 401 };
	if (player.isDead) return { error: "Vous êtes mort, accès refusé.", status: 403 };
	return { player };
};

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

/**
 * POST /game/position
 * Mise à jour de la position du joueur
 * Body: { login: string, position: [lat, lon] }
 */
router.post('/position', validateToken, (req, res) => {
	try {
		const { position } = req.body;
		const login = req.user.login;

		if (!position || position.length !== 2) {
			return res.status(400).json({ error: "Position invalide" });
		}

		if (!gameState.players[login]) {
			gameState.players[login] = {
				role: req.user.role.toLowerCase(),
				score: 0,
				isDead: false
			};
		}

		let user = gameState.players[login];
		if (user.isDead) return res.status(403).json({ error: "Vous êtes mort.", type: "death" });
		user.position = position;

		const currentTime = Date.now();
		let alerts = [];

		// Check ZRR
		if (gameState.zrr.limits) {
			const inside = isInsideZRR(position, gameState.zrr.limits);
			user.isOutOfZone = !inside;
		}

		// Check Mort par créature
		gameState.objects.forEach(obj => {
			if (['creature', 'monster'].includes(obj.type.toLowerCase())) {
				if (calculateDistance(position, obj.position) < 5) {
					user.isDead = true;
					eventLogger.warn(`${login} dévoré par une créature !`);
				}
			}
		});

		if (user.isDead) {
			return res.status(403).json({ error: "Vous avez été éliminé (dévoré)", type: "death" });
		}

		const visiblePlayers = Object.entries(gameState.players)
			.filter(([id, p]) => p.position && id !== login)
			.map(([id, p]) => ({
				id: id,
				position: p.position,
				role: p.role,
				score: p.score || 0
			}));

		// Filtrer les objets actifs
		const activeObjects = gameState.objects
			.filter(obj => {
				const remainingTtl = obj.ttl - (currentTime - obj.createdAt) / 1000;
				return remainingTtl > 0;
			})
			.map(obj => {
				const elapsed = (currentTime - obj.createdAt) / 1000;
				let finalPos = obj.position;

				// Brouillage pour explorateur
				if (user.role === 'explorateur' && user.position) {
					const dist = 0.0001;
					finalPos = [
						obj.position[0] + (Math.random() - 0.5) * dist,
						obj.position[1] + (Math.random() - 0.5) * dist
					];
				}

				return {
					id: obj.id,
					position: finalPos,
					type: obj.type,
					ttl: Math.max(0, obj.ttl - elapsed)
				};
			});

		res.json({
			players: visiblePlayers,
			objects: activeObjects,
			processedObjects: gameState.processedObjects,
			alerts: alerts
		});

	} catch (error) {
		eventLogger.error(`Erreur mise à jour position: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * GET /game/resources
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
		const role = (req.user.role || "").toLowerCase();

		let user = gameState.players[login];
		if (!user) {
			// Si c'est un admin, on l'autorise et on lui crée un profil fictif
			if (role === 'admin' || role === 'administrator') {
				user = {
					role: 'admin',
					position: [45.782, 4.8656], // Position par défaut
					score: 0
				};
			} else {
				// Si c'est un Rival qui n'a jamais envoyé sa position, on bloque
				return res.status(401).json({ error: "Joueur inconnu (envoyez votre position d'abord)" });
			}
		}

		if (user.isDead && role !== 'admin') {
			return res.status(403).json({ error: "Vous êtes mort, accès refusé." });
		}

		const currentTime = Date.now();
		const alerts = [];

		// Filtrer les joueurs visibles
		const visiblePlayers = Object.entries(gameState.players)
			.filter(([id, p]) => {
				if (id === login) return false;
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
		const activeObjects = gameState.objects
			.filter(obj => {
				const elapsed = (currentTime - obj.createdAt) / 1000;
				const remainingTtl = obj.ttl - elapsed;
				return remainingTtl > 0;
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
 * POST /game/process-object
 * Traite un objet (doit être à moins de 5m)
 * Body: { login: string, objectId: string }
 */
router.post('/process-object', validateToken, (req, res) => {
	try {
		const { objectId } = req.body;
		const login = req.user.login;

		if (!objectId) {
			return res.status(400).json({ error: "Format invalide. Requis: objectId" });
		}

		const check = getActivePlayer(login);
		if (check.error) return res.status(check.status).json({ error: check.error });
		const user = check.player;

		if (!user.position) return res.status(400).json({ error: "Position inconnue" });

		const objIndex = gameState.objects.findIndex(o => o.id === objectId);
		if (objIndex === -1) {
			return res.status(404).json({ error: "Objet non trouvé ou expiré" });
		}
		const obj = gameState.objects[objIndex];

		const distance = calculateDistance(user.position, obj.position);
		const maxDistance = (user.role === 'explorateur') ? 10 : 5;

		console.log(`🎯 [PROCESS] ${login} tente de traiter ${obj.type} à ${distance.toFixed(2)}m`);

		const typeLower = obj.type.toLowerCase();

		// Créature : mort immédiate sans vérification de distance
		if (['creature', 'monster', 'monstre'].includes(typeLower)) {
			console.log(`💀 [DEATH] ${login} a touché une créature !`);
			user.isDead = true;
			return res.status(403).json({
				success: false,
				error: "Vous avez été dévoré par une créature !",
				type: "death"
			});
		}

		// Artefact : vérifier la distance
		if (distance > maxDistance) {
			eventLogger.warn(`${login} a tenté de traiter ${objectId} à ${distance.toFixed(2)}m (trop loin)`);
			return res.status(403).json({
				error: "Trop loin pour collecter",
				distance: distance.toFixed(2),
				maxAutorisee: maxDistance
			});
		}

		const [processedObj] = gameState.objects.splice(objIndex, 1);

		// Traiter l'objet
		gameState.processedObjects.push({
			...processedObj,
			processedBy: login,
			processedAt: Date.now()
		});

		// Mise à jour du score
		user.score = (user.score || 0) + 1;
		user.objectsProcessed = (user.objectsProcessed || 0) + 1;

		eventLogger.info(`${login} a traité ${objectId} (${obj.type}) - Nouveau Score: ${user.score}`);

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
 * POST /game/capture-rival
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
 * GET /game/zrr
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
 * POST /game/logout
 * Supprime le joueur de la session (sans toucher au store du client)
 */
router.post('/logout', validateToken, (req, res) => {
	try {
		const login = req.user.login;
		if (gameState.players[login]) {
			delete gameState.players[login];
			eventLogger.info(`${login} s'est déconnecté - supprimé de l'état serveur`);
		}
		res.json({ success: true });
	} catch (error) {
		eventLogger.error(`Erreur logout: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});


/**
 * PUT /game/profile
 * Met à jour le profil du joueur (password, imageUrl)
 */
router.put('/profile', validateToken, async (req, res) => {
	try {
		const login = req.user.login;
		const { password, imageUrl } = req.body;

		// Récupérer les données actuelles de l'utilisateur
		const getRes = await fetch(`http://localhost:8080/users/${login}`, {
			headers: {
				'Authorization': req.headers.authorization,
				'Origin': 'http://localhost:5173'
			}
		});

		if (!getRes.ok) {
			return res.status(404).json({ error: "Utilisateur non trouvé" });
		}

		const userData = await getRes.json();
		console.log('userData:', userData);

		// Mettre à jour uniquement les champs fournis
		const updatedUser = {
			...userData,
			password: password || userData.password,
			image: imageUrl || userData.image,
		};

		const putRes = await fetch(`http://localhost:8080/users/${login}`, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': req.headers.authorization,
				'Origin': 'http://localhost:5173'
			},
			body: JSON.stringify(updatedUser)
		});

		if (!putRes.ok) {
			return res.status(400).json({ error: "Erreur lors de la mise à jour du profil" });
		}

		if (imageUrl && gameState.players[login]) {
			gameState.players[login].imageUrl = imageUrl;
		}

		eventLogger.info(`${login} a mis à jour son profil`);
		res.json({ success: true });

	} catch (error) {
		eventLogger.error(`Erreur mise à jour profil: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

export default router;