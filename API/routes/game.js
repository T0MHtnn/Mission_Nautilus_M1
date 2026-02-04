import express from 'express';
import { gameState } from '../models/data.js';
import { calculateDistance } from '../utils/geo.js';
import { eventLogger } from '../utils/logger.js';

const router = express.Router();

// 1. Mise à jour de la position
router.post('/position', (req, res) => {
	const { login, position } = req.body;
	if (!gameState.players[login]) {
		gameState.players[login] = { role: 'explorateur', score: 0 };
	}
	gameState.players[login].position = position;
	eventLogger.info(`Joueur ${login} a mis à jour sa position : ${position}`);
	res.json({ status: "OK" });
});

// 2. Liste des ressources (filtrées)
router.get('/resources', (req, res) => {
	const { login } = req.query; // Pour savoir qui demande
	const user = gameState.players[login];
	if (!user) return res.status(404).json({ error: "Joueur non trouvé" });

	const visiblePlayers = Object.entries(gameState.players)
		.filter(([name, p]) => {
			if (user.role === 'rival') return true; // Les rivaux voient tout le monde
			return p.role === 'explorateur'; // Les explorateurs ne voient que les explorateurs
		})
		.map(([name, p]) => ({ id: name, position: p.position, role: p.role }));

	// On ne renvoie que les objets dont le TTL > 0
	const activeObjects = gameState.objects.filter(obj => {
		const elapsed = (Date.now() - obj.createdAt) / 1000;
		return (obj.ttl - elapsed) > 0;
	});

	res.json({ players: visiblePlayers, objects: activeObjects });
});

// 3 & 4. Traitement d'un objet ou capture d'un rival
router.post('/action', (req, res) => {
	const { login, targetId, type } = req.body; // type: 'object' ou 'player'
	const user = gameState.players[login];

	if (type === 'object') {
		const obj = gameState.objects.find(o => o.id === targetId);
		const dist = calculateDistance(user.position, obj.position);
		if (dist < 5) {
			obj.ttl = 0; // On "consomme" l'objet
			user.score++;
			eventLogger.info(`${login} a traité l'objet ${targetId}`);
			return res.json({ success: true });
		}
	}
	res.status(403).json({ success: false, message: "Trop loin ou action impossible" });
});

// 5. Récupération ZRR
router.get('/zrr', (req, res) => {
	res.json(gameState.zrr);
});

export default router;