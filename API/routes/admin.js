import express from 'express';
import { gameState } from '../models/data.js';
import { eventLogger } from '../utils/logger.js';
import { validateToken, requireAdmin } from '../utils/auth.js';

const router = express.Router();

/**
 * 1. POST /admin/zrr
 * Fixe le périmètre de jeu (Zone de Recherche et Récupération)
 * Body: { p1: [lat, lon], p2: [lat, lon] }
 * 
 * Crée un rectangle dont p1 et p2 sont les coins
 */
router.post('/zrr', validateToken, requireAdmin, (req, res) => {
	try {
		const { p1, p2 } = req.body;

		// Validation
		if (!p1 || !p2 || p1.length !== 2 || p2.length !== 2) {
			return res.status(400).json({ error: "Format invalide. Requis: p1 [lat, lon], p2 [lat, lon]" });
		}

		// Extraire les coordonnées
		const lats = [p1[0], p2[0]];
		const lons = [p1[1], p2[1]];

		// Calculer les 4 coins du rectangle
		const limits = {
			no: [Math.max(...lats), Math.min(...lons)], // Nord-Ouest
			ne: [Math.max(...lats), Math.max(...lons)], // Nord-Est
			se: [Math.min(...lats), Math.max(...lons)], // Sud-Est
			so: [Math.min(...lats), Math.min(...lons)]  // Sud-Ouest
		};

		gameState.zrr.points = [p1, p2];
		gameState.zrr.limits = limits;

		eventLogger.info(`Admin a défini la ZRR: NO=[${limits.no}], NE=[${limits.ne}], SE=[${limits.se}], SO=[${limits.so}]`);

		res.json({
			status: "ZRR définie avec succès",
			limits: limits
		});
	} catch (error) {
		eventLogger.error(`Erreur définition ZRR: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 2. POST /admin/ttl
 * Précise le TTL initial par défaut (en secondes)
 * Body: { ttl: number }
 */
router.post('/ttl', validateToken, requireAdmin, (req, res) => {
	try {
		const { ttl } = req.body;

		// Validation
		if (typeof ttl !== 'number' || ttl <= 0) {
			return res.status(400).json({ error: "TTL doit être un nombre positif (en secondes)" });
		}

		gameState.defaultTTL = ttl;

		eventLogger.info(`Admin a fixé le TTL par défaut à ${ttl} secondes`);

		res.json({
			status: "TTL mis à jour",
			defaultTTL: gameState.defaultTTL
		});
	} catch (error) {
		eventLogger.error(`Erreur mise à jour TTL: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 3. POST /admin/player-role
 * Spécifie le rôle d'un joueur (rival ou explorateur, pas admin)
 * Body: { login: string, role: "rival" | "explorateur" }
 */
router.post('/player-role', validateToken, requireAdmin, (req, res) => {
	try {
		const { login, role } = req.body;

		// Validation
		if (!login) {
			return res.status(400).json({ error: "Login requis" });
		}

		if (!['rival', 'explorateur'].includes(role)) {
			return res.status(400).json({ error: "Rôle invalide. Doit être 'rival' ou 'explorateur'" });
		}

		// Vérifier que le joueur existe
		if (!gameState.players[login]) {
			// Créer le joueur s'il n'existe pas
			gameState.players[login] = {
				role: role.toLowerCase(),
				score: 0,
				objectsProcessed: 0
			};
		} else {
			gameState.players[login].role = role.toLowerCase();
		}

		eventLogger.info(`Admin a assigné le rôle '${role}' au joueur ${login}`);

		res.json({
			status: "Rôle mis à jour",
			login: login,
			role: gameState.players[login].role
		});
	} catch (error) {
		eventLogger.error(`Erreur assignation rôle: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * 4. POST /admin/spawn-object
 * Déclenche l'apparition d'un nouvel objet
 * Body: { position: [lat, lon], type?: string }
 */
router.post('/spawn-object', validateToken, requireAdmin, (req, res) => {
	try {
		const { position, type } = req.body;

		// Validation
		if (!position || position.length !== 2) {
			return res.status(400).json({ error: "Format invalide. Requis: position [lat, lon]" });
		}

		const newObj = {
			id: `obj_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
			position: position,
			type: type || 'artefact',
			ttl: gameState.defaultTTL,
			createdAt: Date.now()
		};

		gameState.objects.push(newObj);

		eventLogger.info(`Admin a créé l'objet ${newObj.id} (${newObj.type}) en [${position[0]}, ${position[1]}] avec TTL=${newObj.ttl}s`);

		res.json({
			status: "Objet créé avec succès",
			object: newObj
		});
	} catch (error) {
		eventLogger.error(`Erreur création objet: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

/**
 * GET /admin/status
 * Retourne le statut général du jeu
 */
router.get('/status', validateToken, requireAdmin, (req, res) => {
	try {
		const playerCount = Object.keys(gameState.players).length;
		const objectCount = gameState.objects.length;

		const playersByRole = {
			rival: 0,
			explorateur: 0,
			admin: 0
		};

		Object.values(gameState.players).forEach(p => {
			const playerRole = p.role || 'unknown';
			if (Object.prototype.hasOwnProperty.call(playersByRole, playerRole)) {
				playersByRole[playerRole]++;
			}
		});

		res.json({
			playerCount: playerCount,
			playersByRole: playersByRole,
			objectCount: objectCount,
			zrrDefined: gameState.zrr.limits !== null,
			defaultTTL: gameState.defaultTTL
		});
	} catch (error) {
		eventLogger.error(`Erreur récupération status: ${error.message}`);
		res.status(500).json({ error: "Erreur serveur" });
	}
});

export default router;