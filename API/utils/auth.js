/**
 * Middleware de validation du token JWT
 * Pour le moment, accepte toujours (faux test)
 * À remplacer par une vraie validation via le serveur d'authentification
 */
export async function validateToken(req, res, next) {
	try {
		// TODO: Implémenter la validation du token via le serveur d'authentification
		// import axios from 'axios';
		// const AUTH_SERVER = 'http://localhost:8080';
		// const token = req.headers.authorization?.split(' ')[1];
		// const response = await axios.post(`${AUTH_SERVER}/api/validate`, { token });
		// req.user = response.data;
		
		// Pour l'instant, on accepte tous les tokens (faux test)
		const token = req.headers.authorization?.split(' ')[1];
		
		if (!token) {
			// Pas de token : utiliser les infos du body
			req.user = { login: req.body.login || req.query.login || 'test-user', role: 'explorateur' };
			return next();
		}

		// Accepter tous les tokens pour l'instant
		req.user = { login: req.body.login || req.query.login || 'test-user', role: 'explorateur' };
		next();
	} catch (error) {
		// eslint-disable-next-line no-undef
		eventLogger.error(`Erreur d'authentification: ${error.message}`);
		res.status(401).json({ error: 'Authentification échouée' });
	}
}

/**
 * Middleware pour vérifier que l'utilisateur est administrateur
 */
export function requireAdmin(req, res, next) {
	// TODO: Implémenter après intégration de la vraie authentification
	// if (req.user?.role !== 'admin') {
	// 	return res.status(403).json({ error: 'Accès administrateur requis' });
	// }
	next();
}
