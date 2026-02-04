import express from 'express';
import { gameState } from '../models/data.js';
import { eventLogger } from '../utils/logger.js';

const router = express.Router();

// 1. Fixer la ZRR
router.post('/zrr', (req, res) => {
	const { p1, p2 } = req.body; // p1: [lat, lon], p2: [lat, lon]
	gameState.zrr.points = [p1, p2];
	// Ici on pourrait calculer NO, NE, SE, SO
	eventLogger.info(`Admin a défini la ZRR`);
	res.json({ status: "ZRR définie" });
});

// 2. Préciser le TTL initial
router.post('/ttl', (req, res) => {
	gameState.defaultTTL = req.body.ttl;
	res.json({ status: "TTL mis à jour" });
});

// 3. Spécifier l'espèce d'un joueur
router.post('/player-role', (req, res) => {
	const { login, role } = req.body;
	if (gameState.players[login]) {
		gameState.players[login].role = role;
		res.json({ status: "Rôle mis à jour" });
	} else {
		res.status(404).send("Joueur inconnu");
	}
});

// 4. Déclencher l'apparition d'un objet
router.post('/spawn', (req, res) => {
	const newObj = {
		id: `obj_${Date.now()}`,
		position: req.body.position,
		type: req.body.type || 'tresor',
		ttl: gameState.defaultTTL,
		createdAt: Date.now()
	};
	gameState.objects.push(newObj);
	eventLogger.info(`Nouvel objet apparu en ${req.body.position}`);
	res.json(newObj);
});

export default router;