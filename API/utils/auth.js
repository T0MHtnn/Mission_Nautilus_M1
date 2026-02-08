import axios from 'axios';
import { eventLogger } from './logger.js';

/**
 * Middleware de validation du token JWT
 * Pour le moment, accepte toujours (faux test)
 * À remplacer par une vraie validation via le serveur d'authentification
 */
export async function validateToken(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader) return res.status(401).json({ error: 'Token manquant' });

	const token = authHeader.split(' ')[1];

	try {
		// Extraction du payload pour obtenir l'origine déclarée lors du login
		const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
		const tokenOrigin = payload.origin;

		// Validation auprès du serveur Java
		await axios.get('http://127.0.0.1:8080/authenticate', {
			params: {
				jwt: token,
				origin: tokenOrigin
			},
			family: 4 // Force axios à utiliser IPv4
		});

		// Stockage des informations utilisateur certifiées
		req.user = {
			login: payload.sub,
			role: (payload.species || "").toLowerCase()
		};

		next();

	} catch (error) {
		eventLogger.error(`Échec authentification : ${error.response?.status || error.message}`);
		res.status(401).json({ error: 'Token invalide ou rejeté' });
	}
}

/**
 * Middleware pour vérifier que l'utilisateur est administrateur
 */
export function requireAdmin(req, res, next) {
	console.log(req.user)
	if (req.user?.role !== 'admin') {
		return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
	}
	next();
}
