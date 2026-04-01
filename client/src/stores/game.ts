import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PlayerData, GameObject, ZRR } from "../mocks/gameData";
import { mockLocalPlayer } from "../mocks/gameData";

const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:3376";
const AUTH_BASE = import.meta.env.VITE_AUTH_TARGET || "http://localhost:8080/auth";

export const useGameStore = defineStore("game", () => {
  // --- État ---
  const token = ref<string | null>(localStorage.getItem("zanzibar_token"));
  const logged = ref(!!token.value);
  const login = ref(localStorage.getItem("zanzibar_login") || "");
  const isFetching = ref(false);
  const gameMessage = ref<{ title: string; body: string; type: 'success' | 'error' } | null>(null);
  const isGameOver = ref(false);

  // Joueurs distants
  const players = ref<PlayerData[]>([]);

  // Objets du jeu
  const objects = ref<GameObject[]>([]);

  // ZRR
  const zrr = ref<ZRR>({ defined: false, limits: null });

  // Joueur local (position simulée variable)
  const localPlayer = ref({
    ...mockLocalPlayer,
    position: [...mockLocalPlayer.position] as [number, number],
  });

  // Intervalles
  let pollingInterval: any = null;

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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: user, password }),
      });

      if (!res.ok) {
        console.error("Erreur Login:", res.status);
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
      localStorage.setItem("zanzibar_login", user);
      login.value = user;
      logged.value = true;
      localPlayer.value.id = user;
      localPlayer.value.role = "rival";
      startPolling();
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
    stopPolling();
  }

  /** Simuler le déplacement du joueur local (petit mouvement aléatoire) */
  function simulateLocalMovement() {
    const delta = 0.00005; // ~5m
    localPlayer.value.position = [
      localPlayer.value.position[0] + (Math.random() - 0.5) * delta * 2,
      localPlayer.value.position[1] + (Math.random() - 0.5) * delta * 2,
    ];
  }

  /** Démarrer le polling toutes les 5s (positions + ressources + envoi position) */
  function startPolling() {
    if (pollingInterval) return;

    updateGameState();

    sendPosition().then(() => {
      updateGameState();
    });

    pollingInterval = setInterval(async () => {
      simulateLocalMovement();
      await sendPosition();
      await updateGameState();
      checkProximity();
    }, 5000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
  }

  /** Action principale : récupère l'état du jeu depuis le serveur */
  async function updateGameState() {
    if (!token.value) return;
    try {
      console.log("📡 [STORE] Lancement du polling...");

      const [posRes, resRes, zrrRes] = await Promise.all([
        fetch(`${API_BASE}/game/position`, {
          method: "POST",
          headers: authHeaders.value,
          body: JSON.stringify({ position: localPlayer.value.position })
        }),
        fetch(`${API_BASE}/game/resources`, { headers: authHeaders.value }),
        fetch(`${API_BASE}/game/zrr`, { headers: authHeaders.value }),
      ]);

      console.log("📡 [STORE] Statut réponse ZRR:", zrrRes.status);

      if (posRes.ok) {
        const posData = await posRes.json();
        if (posData.players) {
          players.value = posData.players;
        }
      }

      if (resRes.ok) {
        const resData = await resRes.json();

        const me = resData.players?.find((p: any) => p.id === login.value);
        if (me) {
          localPlayer.value.score = me.score;
        }

        if (resData.players) {
          players.value = resData.players;
        }
        const activeOnes = (resData.objects || []).map((o: any) => ({ ...o, discovered: false }));
        const processedOnes = (resData.processedObjects || []).map((o: any) => ({
          ...o,
          discovered: true,
          ttl: 0
        }));

        objects.value = [...activeOnes, ...processedOnes];

        if (resData.objects) {
          console.log("📦 [STORE] Objets reçus:", resData.objects?.length || 0);
          objects.value = resData.objects.map(
            (o: Omit<GameObject, "discovered">) => ({
              ...o,
              discovered: false,
            }),
          );
        }
        if (resData.processedObjects) {
          const processed = resData.processedObjects.map(
            (o: Omit<GameObject, "discovered" | "ttl">) => ({
              ...o,
              discovered: true,
              ttl: 0,
            }),
          );
          objects.value = [...objects.value, ...processed];
        }
      }

      if (zrrRes.ok) {
        const zrrData = await zrrRes.json();
        console.log("📦 [STORE] Données ZRR reçues du serveur:", JSON.stringify(zrrData));

        zrr.value = zrrData;
        console.log("ZRR mise à jour :", zrr.value);
      } else {
        console.error("❌ [STORE] Erreur sur la route /zrr");
      }
    } catch (e) {
      console.warn("Erreur updateGameState (utilisation des mocks):", e);
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
  async function checkProximity() {
    const pos = localPlayer.value.position;
    for (const obj of objects.value) {
      if (obj.discovered) continue;
      const dist = distanceMeters(pos, obj.position);
      if (dist < 5) {
        obj.discovered = true;
        console.log(
          `Objet ${obj.id} (${obj.type}) découvert à ${dist.toFixed(1)}m !`,
        );
        await sendPosition();
        await processObject(obj.id);
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
      const data = await res.json();
      if (res.ok) {
        localPlayer.value.score = data.newScore;
        gameMessage.value = {
          title: "💎 Artefact Récupéré !",
          body: `Félicitations ! Votre score est maintenant de ${data.newScore}.`,
          type: 'success'
        };
        console.log(`Score mis à jour: ${localPlayer.value.score}`);
      } else if (res.status === 403 && data.error.includes("dévoré")) {
        isGameOver.value = true;
        gameMessage.value = {
          title: "💀 GAME OVER",
          body: "Vous avez servi de déjeuner à une créature marine... Votre mission s'arrête ici.",
          type: 'error'
        };
        stopPolling();
      }
    } catch (e) {
      console.warn("Erreur réseau lors du traitement de l'objet", e);
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

  if (token.value) {
    startPolling();
  }

  return {
    // State
    gameMessage,
    isGameOver,
    token,
    logged,
    login,
    isFetching,
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
    updateGameState,
    startPolling,
    stopPolling,
    sendPosition,
    distanceMeters,
    checkProximity,
    processObject,
    updateProfile,
  };
});
