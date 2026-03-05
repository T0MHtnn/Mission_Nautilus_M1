import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PlayerData, GameObject, ZRR } from "../mocks/gameData";
import {
  mockPlayers,
  mockObjects,
  mockZRR,
  mockLocalPlayer,
} from "../mocks/gameData";

const API_BASE = "/api";
const AUTH_BASE = "/auth";

export const useGameStore = defineStore("game", () => {
  // --- État ---
  const token = ref<string | null>(localStorage.getItem("zanzibar_token"));
  const logged = ref(!!token.value);
  const login = ref("");

  // Joueurs distants
  const players = ref<PlayerData[]>([...mockPlayers]);

  // Objets du jeu
  const objects = ref<GameObject[]>([...mockObjects]);

  // ZRR
  const zrr = ref<ZRR>({ ...mockZRR });

  // Joueur local (position simulée variable)
  const localPlayer = ref({
    ...mockLocalPlayer,
    position: [...mockLocalPlayer.position] as [number, number],
  });

  // Intervalle d'envoi de position
  let positionInterval: ReturnType<typeof setInterval> | null = null;

  // --- Getters ---
  const undiscoveredObjects = computed(() =>
    objects.value.filter((o) => !o.discovered),
  );
  const discoveredObjects = computed(() =>
    objects.value.filter((o) => o.discovered),
  );

  const authHeaders = computed(() => ({
    Authorization: `Bearer ${token.value}`,
    "Content-Type": "application/json",
  }));

  // --- Actions ---

  /** Login via le serveur Spring d'authentification */
  async function doLogin(
    user: string,
    password: string,
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // application/x-www-form-urlencoded = simple request CORS (pas de preflight OPTIONS)
      const res = await fetch(`${AUTH_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, //
        body: JSON.stringify({ login: user, password }), //
      });

      if (!res.ok) {
        return { success: false, error: "Identifiants incorrects" };
      }

      // Le JWT peut être dans le header Authorization ou dans le body
      const authHeader = res.headers.get("Authorization");
      const jwt = authHeader?.startsWith("Bearer ")
        ? authHeader.substring(7)
        : authHeader;

      let bodyToken: string | null = null;
      try {
        const data = await res.json();
        bodyToken = data.token || data.jwt || null;
      } catch {
        // pas de body JSON
      }

      const finalToken = jwt || bodyToken;

      if (!finalToken) {
        return { success: false, error: "Aucun token reçu du serveur" };
      }

      // Vérifier que l'utilisateur est un rival
      const parts = finalToken.split(".");
      if (parts.length >= 2) {
        try {
          const payload = JSON.parse(atob(parts[1]!));
          const species = (payload.species || "").toLowerCase();
          if (species !== "rival") {
            return {
              success: false,
              error: "Seuls les rivaux peuvent se connecter",
            };
          }
        } catch {
          // Si le décodage échoue, on continue quand même
        }
      }

      token.value = finalToken;
      localStorage.setItem("zanzibar_token", finalToken);
      login.value = user;
      logged.value = true;
      startPositionUpdates();
      return { success: true };
    } catch {
      return {
        success: false,
        error: "Impossible de contacter le serveur d'authentification",
      };
    }
  }

  /** Logout */
  function logout() {
    logged.value = false;
    token.value = null;
    login.value = "";
    localStorage.removeItem("zanzibar_token");
    stopPositionUpdates();
  }

  /** Simuler le déplacement du joueur local (petit mouvement aléatoire) */
  function simulateLocalMovement() {
    const delta = 0.00005; // ~5m
    localPlayer.value.position = [
      localPlayer.value.position[0] + (Math.random() - 0.5) * delta * 2,
      localPlayer.value.position[1] + (Math.random() - 0.5) * delta * 2,
    ];
  }

  /** Envoyer la position du joueur au serveur Express toutes les 5 secondes */
  function startPositionUpdates() {
    if (positionInterval) return;
    positionInterval = setInterval(async () => {
      simulateLocalMovement();
      await sendPosition();
      checkProximity();
    }, 5000);
  }

  function stopPositionUpdates() {
    if (positionInterval) {
      clearInterval(positionInterval);
      positionInterval = null;
    }
  }

  /** Envoyer la position au serveur */
  async function sendPosition() {
    if (!token.value) return;
    try {
      await fetch(`${API_BASE}/game/position`, {
        method: "POST",
        headers: authHeaders.value,
        body: JSON.stringify({
          position: localPlayer.value.position,
        }),
      });
    } catch (e) {
      console.warn("Erreur envoi position:", e);
    }
  }

  /** Récupérer les ressources depuis le serveur */
  async function fetchResources() {
    if (!token.value) return;
    try {
      const res = await fetch(`${API_BASE}/game/resources`, {
        headers: authHeaders.value,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.players) {
          players.value = data.players;
        }
        if (data.objects) {
          objects.value = data.objects.map(
            (o: Omit<GameObject, "discovered">) => ({
              ...o,
              discovered: false,
            }),
          );
        }
        if (data.processedObjects) {
          const processed = data.processedObjects.map(
            (o: Omit<GameObject, "discovered" | "ttl">) => ({
              ...o,
              discovered: true,
              ttl: 0,
            }),
          );
          objects.value = [...objects.value, ...processed];
        }
      }
    } catch (e) {
      console.warn("Erreur fetch resources (utilisation des mocks):", e);
    }
  }

  /** Récupérer la ZRR depuis le serveur */
  async function fetchZRR() {
    if (!token.value) return;
    try {
      const res = await fetch(`${API_BASE}/game/zrr`, {
        headers: authHeaders.value,
      });
      if (res.ok) {
        const data = await res.json();
        if (data.defined) {
          zrr.value = data;
        }
      }
    } catch (e) {
      console.warn("Erreur fetch ZRR (utilisation du mock):", e);
    }
  }

  /**
   * Calcul de distance entre deux positions [lat, lng] en mètres (Haversine)
   */
  function distanceMeters(p1: [number, number], p2: [number, number]): number {
    const R = 6371000;
    const dLat = ((p2[0] - p1[0]) * Math.PI) / 180;
    const dLon = ((p2[1] - p1[1]) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((p1[0] * Math.PI) / 180) *
        Math.cos((p2[0] * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Vérifier la proximité avec les objets (< 5m) */
  function checkProximity() {
    const pos = localPlayer.value.position;
    for (const obj of objects.value) {
      if (obj.discovered) continue;
      const dist = distanceMeters(pos, obj.position);
      if (dist < 5) {
        obj.discovered = true;
        console.log(
          `Objet ${obj.id} (${obj.type}) découvert à ${dist.toFixed(1)}m !`,
        );
        processObject(obj.id);
      }
    }
  }

  /** Traiter un objet côté serveur */
  async function processObject(objectId: string) {
    if (!token.value) return;
    try {
      const res = await fetch(`${API_BASE}/game/process-object`, {
        method: "POST",
        headers: authHeaders.value,
        body: JSON.stringify({ objectId }),
      });
      if (res.ok) {
        const data = await res.json();
        localPlayer.value.score = data.newScore ?? localPlayer.value.score + 1;
        console.log(`Score mis à jour: ${localPlayer.value.score}`);
      }
    } catch (e) {
      localPlayer.value.score++;
      console.warn("Erreur process object (mock):", e);
    }
  }

  /** Mettre à jour le profil (password, imageUrl) */
  async function updateProfile(password?: string, imageUrl?: string) {
    if (!token.value) return false;
    try {
      const res = await fetch(`${API_BASE}/game/profile`, {
        method: "PUT",
        headers: authHeaders.value,
        body: JSON.stringify({ password, imageUrl }),
      });
      return res.ok;
    } catch {
      console.warn("Erreur mise à jour profil");
      return false;
    }
  }

  return {
    // State
    token,
    logged,
    login,
    players,
    objects,
    zrr,
    localPlayer,
    // Getters
    undiscoveredObjects,
    discoveredObjects,
    authHeaders,
    // Actions
    doLogin,
    logout,
    simulateLocalMovement,
    startPositionUpdates,
    stopPositionUpdates,
    sendPosition,
    fetchResources,
    fetchZRR,
    distanceMeters,
    checkProximity,
    processObject,
    updateProfile,
  };
});
