/**
 * Mock data pour simuler les positions de joueurs et objets géolocalisés
 * Tous autour de Nautibus (45.782, 4.8656)
 */

export interface PlayerData {
  id: string;
  position: [number, number];
  role: "explorateur" | "rival";
  score: number;
}

export interface GameObject {
  id: string;
  position: [number, number];
  type: string;
  ttl: number; // secondes restantes
  discovered: boolean;
}

export interface ZRR {
  defined: boolean;
  limits: {
    no: [number, number]; // Nord-Ouest
    ne: [number, number]; // Nord-Est
    se: [number, number]; // Sud-Est
    so: [number, number]; // Sud-Ouest
  } | null;
}

// Joueurs mockés (autour de Nautibus)
export const mockPlayers: PlayerData[] = [
  { id: "alice", position: [45.78215, 4.8657], role: "explorateur", score: 3 },
  { id: "bob", position: [45.78195, 4.8654], role: "rival", score: 5 },
  { id: "charlie", position: [45.78225, 4.866], role: "explorateur", score: 1 },
  { id: "diana", position: [45.7818, 4.8658], role: "rival", score: 7 },
];

// Objets mockés
export const mockObjects: GameObject[] = [
  {
    id: "obj1",
    position: [45.7821, 4.8655],
    type: "tresor",
    ttl: 120,
    discovered: false,
  },
  {
    id: "obj2",
    position: [45.782, 4.8659],
    type: "tresor",
    ttl: 60,
    discovered: false,
  },
  {
    id: "obj3",
    position: [45.7823, 4.86555],
    type: "piege",
    ttl: 300,
    discovered: true,
  },
  {
    id: "obj4",
    position: [45.7819, 4.86565],
    type: "tresor",
    ttl: 45,
    discovered: true,
  },
  {
    id: "obj5",
    position: [45.78205, 4.8661],
    type: "creature",
    ttl: 180,
    discovered: false,
  },
];

// ZRR mockée (rectangle autour de Nautibus)
export const mockZRR: ZRR = {
  defined: true,
  limits: {
    no: [45.7825, 4.865],
    ne: [45.7825, 4.8665],
    se: [45.7815, 4.8665],
    so: [45.7815, 4.865],
  },
};

// Position initiale du joueur local (mockée, sera simulée comme variable)
export const mockLocalPlayer = {
  id: "moi",
  position: [45.78207, 4.86559] as [number, number],
  role: "rival" as "explorateur" | "rival",
  score: 0,
};
