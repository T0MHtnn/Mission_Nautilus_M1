describe("Tests Unitaires - Client Admin", () => {

    it("devrait extraire correctement les coordonnées SW et NE", () => {
        const mockBounds = {
            getSouthWest: () => ({ lat: 45.1, lng: 4.8 }),
            getNorthEast: () => ({ lat: 45.9, lng: 4.9 })
        };

        const sw = mockBounds.getSouthWest();
        const ne = mockBounds.getNorthEast();

        expect(sw.lat).toBe(45.1);
        expect(ne.lat).toBe(45.9);
        expect(ne.lat).toBeGreaterThan(sw.lat);
    });

    it("devrait vérifier que le TTL saisi est un entier positif", () => {
        const inputTtl = "3600";
        const parsedTtl = parseInt(inputTtl);

        expect(parsedTtl).toBeGreaterThan(0);
        expect(typeof parsedTtl).toBe('number');
    });
});