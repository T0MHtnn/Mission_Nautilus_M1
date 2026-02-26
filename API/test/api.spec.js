import { validerZrr, estExpire } from './logic.js';

describe("Tests Unitaires - Logique Serveur", () => {

	it("devrait valider une ZRR correcte", () => {
		expect(validerZrr("45.1", "45.8")).toBe(true);
	});

	it("devrait refuser une ZRR inversée", () => {
		expect(validerZrr("45.8", "45.1")).toBe(false);
	});

	it("devrait détecter un objet expiré", () => {
		const ilYa10Secondes = Date.now() - 10000;
		expect(estExpire(ilYa10Secondes, 5)).toBe(true);
	});


});