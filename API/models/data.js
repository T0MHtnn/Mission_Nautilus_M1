// On simule une base de données en mémoire
export const gameState = {
	players: {}, // Clé : login, Valeur : { position: [lat, lon], role: 'explorateur', score: 0 }
	objects: [], // { id: 'obj1', position: [lat, lon], type: 'tresor', ttl: 60, createdAt: Date.now() }
	processedObjects: [], // { login: 'player1', objectId: 'obj1', timestamp: Date.now() }
	zrr: {
		points: [], // [p1, p2]
		limits: null // { no: [lat, lon], ne: [lat, lon], ... }
	},
	defaultTTL: 60 // 1 minute par défaut
};