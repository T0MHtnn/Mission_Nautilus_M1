import { gameState } from '../models/data.js';
import { eventLogger } from './logger.js';

/**
 * Interval pour nettoyer les objets expirés (TTL = 0)
 * Exécuté toutes les 5 secondes
 */
export function startTtlCleanup() {
	setInterval(() => {
		const initialCount = gameState.objects.length;
		const currentTime = Date.now();

		// Filtrer les objets dont le TTL a expiré
		gameState.objects = gameState.objects.filter(obj => {
			const elapsed = (currentTime - obj.createdAt) / 1000;
			const remainingTtl = obj.ttl - elapsed;
			return remainingTtl > 0;
		});

		const removedCount = initialCount - gameState.objects.length;
		if (removedCount > 0) {
			eventLogger.info(`Nettoyage TTL: ${removedCount} objet(s) expiré(s) supprimé(s)`);
		}
	}, 5000); // Chaque 5 secondes
}
