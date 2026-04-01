import axios from 'axios';
import { eventLogger } from './logger.js';

/**
 * Middleware de validation du token JWT
 * Pour le moment, accepte toujours (faux test)
 * À remplacer par une vraie validation via le serveur d'authentification
 */
export async function validateToken(req, res, next) {
	const authHeader = req.headers.authorization;
	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		console.error("Format de Header invalide ou manquant :", authHeader);
		return res.status(401).json({ error: 'Token manquant ou format invalide (Bearer requis)' });
	}

	const token = authHeader.split(' ')[1];

	try {
		// Extraction du payload pour obtenir l'origine déclarée lors du login
		const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

		// 2. IMPORTANT : On force l'origin à celle que le JAR attend (souvent celle du client ou de l'admin)
		// Si le JAR a été lancé avec --app-origin=http://localhost:3306, utilisez cette valeur.
		// const tokenOrigin = 'http://localhost:5173';

		console.log("DEBUG PAYLOAD JWT:", payload);

		const tokenOrigin = payload.origin || payload.aud || req.headers.origin || 'http://localhost:3306';

		if (!tokenOrigin) {
			console.error("Le token ne contient pas d'origine (champ 'aud' manquant)");
		}

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
			role: (payload.species || payload.role || "").toString().toLowerCase().trim()
		};

		next();

	} catch (error) {
		console.error(`Détail erreur JAR (8080):`, error.response?.data || error.message);
		eventLogger.error(`Échec authentification : ${error.response?.status || error.message}`);
		res.status(401).json({ error: 'Token invalide ou rejeté' });
	}
}

/**
 * Middleware pour vérifier que l'utilisateur est administrateur
 */
export function requireAdmin(req, res, next) {
	const role = req.user?.role;
	if (role === 'admin' || role === 'administrator') {
		return next();
	}
	console.warn(`Accès refusé: ${req.user?.login} a le rôle ${req.user?.role}`);
	return res.status(403).json({ error: 'Accès réservé aux administrateurs' });
}
