
// Fonction pour valider la ZRR (utilisée par adminRouter)
export const validerZrr = (lat1, lat2) => {
	const l1 = parseFloat(lat1);
	const l2 = parseFloat(lat2);
	if (isNaN(l1) || isNaN(l2)) return false;
	return l2 > l1; // La latitude Nord doit être supérieure à la Sud
};

// Fonction pour vérifier l'expiration (utilisée par le ttl-manager)
export const estExpire = (creationDate, ttlEnSecondes) => {
	const maintenant = Date.now();
	return (maintenant - creationDate) > (ttlEnSecondes * 1000);
};