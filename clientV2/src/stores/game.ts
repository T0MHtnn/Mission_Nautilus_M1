import { defineStore } from "pinia";
import { ref, computed } from "vue";
import type { PlayerData, GameObject, ZRR } from "../mocks/gameData";
import { mockLocalPlayer } from "../mocks/gameData";
import { useNotifications } from '../composables/useNotifications'

const targetPositions = ref(new Map<string, [number, number]>());
let animationFrameId: number | null = null;
const API_BASE = import.meta.env.VITE_API_TARGET || "http://localhost:3376";
const AUTH_BASE =
  import.meta.env.VITE_AUTH_TARGET || "http://localhost:8080/auth";

interface GameApiResponse {
  players?: PlayerData[];
  objects?: GameObject[];
  processedObjects?: Array<Omit<GameObject, "discovered" | "ttl">>;
  newScore?: number;
}

export const useGameStore = defineStore("game", () => {
  // --- État ---
  const token = ref<string | null>(localStorage.getItem("zanzibar_token"));
  const logged = ref(!!token.value);
  const login = ref(localStorage.getItem("zanzibar_login") || "");
  const isFetching = ref(false);
  const gameMessage = ref<{
    title: string;
    body: string;
    type: "success" | "error";
  } | null>(null);
  const isGameOver = ref(false);
  const isLocating = ref(false);
  const locationError = ref<string | null>(null);

  // Joueurs distants
  const players = ref<PlayerData[]>([]);

  // Objets du jeu
  const objects = ref<GameObject[]>([]);

  // ZRR
  const zrr = ref<ZRR>({ defined: false, limits: null });

  // Vecteur de calibrage (différence entre Vraie position GPS et Position voulue)
  const calibrationVector = ref<[number, number]>([0, 0]);

  // Direction (en degrés, de 0 à 360)
  const heading = ref<number>(0);
  let lastRawPosition = ref<[number, number] | null>(null);

  // Joueur local (position simulée variable)
  const localPlayer = ref({
    ...mockLocalPlayer,
    position: [...mockLocalPlayer.position] as [number, number],
  });

  // Intervalles
  let pollingInterval: ReturnType<typeof setInterval> | null = null;
  let ttlInterval: ReturnType<typeof setInterval> | null = null;
  let watchId: number | null = null;

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

      const { requestPermission } = useNotifications()
      await requestPermission()

      localPlayer.value.id = user;
      localPlayer.value.role = "rival";

      // Réinitialiser complètement l'état du jeu pour une nouvelle session
      gameMessage.value = null;
      isGameOver.value = false;
      locationError.value = null;
      players.value = [];
      objects.value = [];
      localPlayer.value.score = 0;
      await startPolling();
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
    const oldToken = token.value;

    // Arrêter le polling immédiatement
    stopPolling();

    // Notifier le serveur pour supprimer le joueur
    if (oldToken) {
      fetch(`${API_BASE}/game/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${oldToken}`,
          "Content-Type": "application/json",
        },
      }).catch(() => {
        // Ignorer les erreurs
      });
    }

    // Nettoyer l'état local
    logged.value = false;
    token.value = null;
    login.value = "";
    gameMessage.value = null;
    isGameOver.value = false;
    locationError.value = null;
    isLocating.value = false;
    localStorage.removeItem("zanzibar_token");
  }

  /** Lancer le GPS et attendre la première position avant de demarrer le polling */
  async function startWatchPosition(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        locationError.value = "Le navigateur ne supporte pas la géolocalisation";
        return reject("Nav non supporté");
      }

      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }

      isLocating.value = true;
      locationError.value = null;

      // Timeout global de 1 minute (60 000 ms) pour la localisation initiale
      const timeoutId = setTimeout(() => {
        if (isLocating.value) {
          isLocating.value = false;
          locationError.value = "Impossible de récupérer la position (Délai d'une minute dépassé).";
          if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            watchId = null;
          }
          reject("Timeout localisation");
        }
      }, 60000);

      let firstLocationCaught = false;

      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const rawLat = position.coords.latitude;
          const rawLon = position.coords.longitude;

          // 1.3 Correction des erreurs de capteurs
          const lat = rawLat + calibrationVector.value[0];
          const lon = rawLon + calibrationVector.value[1];

          // 1.4 Direction des joueurs (Calcul basique si la boussole n'est pas fournie ou gérée par le navigateur)
          if (position.coords.heading !== null && !isNaN(position.coords.heading)) {
            heading.value = position.coords.heading;
          } else if (lastRawPosition.value) {
            // Calcul basier (Bearing) entre deux points si heading n'est pas dispo
            const lat1 = lastRawPosition.value[0] * Math.PI / 180;
            const lon1 = lastRawPosition.value[1] * Math.PI / 180;
            const lat2 = rawLat * Math.PI / 180;
            const lon2 = rawLon * Math.PI / 180;

            const y = Math.sin(lon2 - lon1) * Math.cos(lat2);
            const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
            let brng = Math.atan2(y, x) * 180 / Math.PI;
            heading.value = (brng + 360) % 360;
          }

          lastRawPosition.value = [rawLat, rawLon];
          localPlayer.value.position = [lat, lon];
          console.log(`📍 GPS Mis à jour : [${lat}, ${lon}] (Précision : ${Math.round(position.coords.accuracy)}m)`);

          // Si c'est la toute première position
          if (!firstLocationCaught) {
            firstLocationCaught = true;
            isLocating.value = false;
            clearTimeout(timeoutId);
            resolve();
          } else {
            // Pour les positions suivantes, on en profite pour mettre à jour la position sur le serveur
            if (token.value && !isGameOver.value) {
              sendPosition().catch(() => { });
            }
          }
        },
        (error) => {
          if (firstLocationCaught) return; // Erreur après connexion réussie (ex: perte signal)

          isLocating.value = false;
          clearTimeout(timeoutId);
          if (error.code === error.PERMISSION_DENIED) {
            locationError.value = "Géolocalisation refusée par l'utilisateur.";
          } else {
            locationError.value = "Impossible de récupérer votre position GPS.";
          }
          reject(error.message);
        },
        {
          enableHighAccuracy: true,
          maximumAge: 0,
          timeout: 10000
        }
      );
    });
  }

  /** Démarrer le polling toutes les 5s (positions + ressources) */
  async function startPolling() {
    if (pollingInterval) return;

    // Décroissance du TTL entre les polls
    ttlInterval = setInterval(() => {
      for (const obj of objects.value) {
        if (!obj.discovered && obj.ttl > 0) {
          obj.ttl = Math.max(0, obj.ttl - 1);
        }
      }
    }, 1000);

    const startTime = performance.now();
    try {
      await startWatchPosition();
      const endTime = performance.now();
      console.log(`Performance : Fix GPS obtenu en ${Math.round(endTime - startTime)}ms`);
    } catch (e) {
      console.error("Échec de la géolocalisation: ", e);
      return;
    }

    updateGameState();

    pollingInterval = setInterval(async () => {
      if (!token.value) {
        stopPolling();
        return;
      }
      await updateGameState();
      if (!token.value) return;
      checkProximity();
    }, 5000);
  }

  function stopPolling() {
    if (pollingInterval) {
      clearInterval(pollingInterval);
      pollingInterval = null;
    }
    if (ttlInterval) {
      clearInterval(ttlInterval);
      ttlInterval = null;
    }
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      watchId = null;
    }
  }

  /** Action principale : récupère l'état du jeu depuis le serveur */
  async function updateGameState() {
    if (!token.value || isGameOver.value) return;
    try {
      console.log("📡 [STORE] Lancement du polling...");

      const [posRes, resRes, zrrRes] = await Promise.all([
        fetch(`${API_BASE}/game/position`, {
          method: "POST",
          headers: authHeaders.value,
          body: JSON.stringify({ position: localPlayer.value.position }),
        }),
        fetch(`${API_BASE}/game/resources`, { headers: authHeaders.value }),
        fetch(`${API_BASE}/game/zrr`, { headers: authHeaders.value }),
      ]);

      performance.mark('start-game-logic');
      console.log("📡 [STORE] Statut réponse ZRR:", zrrRes.status);

      if (posRes.ok) {
        const posData = await posRes.json();
        if (posData.players) {
          players.value = posData.players.filter((p: PlayerData) => p.role !== 'rival');
        }
      }

      if (resRes.ok) {
        const resData = (await resRes.json()) as GameApiResponse;
        performance.mark('start-resources-sync');

        const me = resData.players?.find((p: PlayerData) => p.id === login.value);
        if (me) localPlayer.value.score = me.score;

        const existingMap = new Map(objects.value.map(o => [o.id, o]))
        const apiObjects = [...(resData.objects || []), ...(resData.processedObjects || [])]

        objects.value = apiObjects.map(newObj => {
          const existingObj = existingMap.get(newObj.id)
          const currentPos = existingObj ? existingObj.position : (newObj.position || [0, 0])
          const isProcessed = resData.processedObjects?.some(p => p.id === newObj.id) ?? false
          return { ...newObj, position: currentPos, discovered: isProcessed } as GameObject
        })

        objects.value.forEach(obj => {
          if (!obj.discovered && !targetPositions.value.has(obj.id)) {
            const offsetLat = (Math.random() - 0.5) * 0.0008
            const offsetLon = (Math.random() - 0.5) * 0.0008
            targetPositions.value.set(obj.id, [
              obj.position[0] + offsetLat,
              obj.position[1] + offsetLon
            ])
          }
        })

        if (!animationFrameId) animateObjects()

        performance.mark('end-resources-sync')
        performance.measure('Synchronisation Ressources', 'start-resources-sync', 'end-resources-sync')
      }

      if (zrrRes.ok) {
        const zrrData = await zrrRes.json();
        console.log(
          "📦 [STORE] Données ZRR reçues du serveur:",
          JSON.stringify(zrrData),
        );

        zrr.value = zrrData;
        console.log("ZRR mise à jour :", zrr.value);
      } else {
        console.error("❌ [STORE] Erreur sur la route /zrr");
      }

      performance.mark('end-game-logic');
      performance.measure('Traitement Logique Jeu', 'start-game-logic', 'end-game-logic');
    } catch (e) {
      console.warn("Erreur updateGameState (utilisation des mocks):", e);
    }
  }

  function animateObjects() {
    const step = 0.005;
    const tolerance = 0.00001;
    let hasChanges = false;

    const objectsMap = new Map(objects.value.map(o => [o.id, o]))

    for (const [id, target] of targetPositions.value) {
      const obj = objectsMap.get(id)
      if (!obj || obj.discovered) continue

      const distLat = Math.abs(target[0] - obj.position[0])
      const distLon = Math.abs(target[1] - obj.position[1])

      if (distLat < tolerance && distLon < tolerance) {
        targetPositions.value.delete(id)
        continue
      }

      obj.position = [
        obj.position[0] + (target[0] - obj.position[0]) * step,
        obj.position[1] + (target[1] - obj.position[1]) * step
      ] as [number, number]
      hasChanges = true
    }

    if (hasChanges) {
      objects.value = [...objects.value]
    }

    animationFrameId = requestAnimationFrame(animateObjects)
  }

  /** Envoyer la position au serveur */
  async function sendPosition() {
    if (!token.value || isGameOver.value) return;

    try {
      const res = await fetch(`${API_BASE}/game/position`, {
        method: "POST",
        headers: authHeaders.value,
        body: JSON.stringify({
          position: localPlayer.value.position,
        }),
      });
      if (res.status === 403) {
        gameMessage.value = {
          title: "💀 GAME OVER",
          body: "Une créature vous a intercepté !",
          type: "error",
        };
        isGameOver.value = true;
        stopPolling();
      }
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
        console.log(`🎯 Contact avec un objet de type: ${obj.type}`);
        await sendPosition();
        await processObject(obj.id);
      }
    }
  }

  /** Traiter un objet côté serveur */
  async function processObject(objectId: string) {
    if (!token.value || isGameOver.value) return;

    try {
      const res = await fetch(`${API_BASE}/game/process-object`, {
        method: "POST",
        headers: authHeaders.value,
        body: JSON.stringify({ objectId }),
      });

      if (res.status === 403) {
        // Cas Monstre
        let errorMsg = "Vous avez été éliminé par une créature.";
        try {
          const data = await res.json();
          errorMsg = data.error || errorMsg;
        } catch {
          /* ignore JSON error */
        }
        gameMessage.value = {
          title: "💀 GAME OVER",
          body: errorMsg,
          type: "error",
        };
        isGameOver.value = true;
        stopPolling();
        const { sendNotification } = useNotifications()
        sendNotification('💀 Game Over', errorMsg)
        return;
      }

      const data = await res.json();

      if (res.ok) {
        const { sendNotification } = useNotifications()

        if ("vibrate" in navigator) {
          navigator.vibrate([200, 100, 200]);
        }

        // Cas Artefact
        localPlayer.value.score = data.newScore;
        gameMessage.value = {
          title: "💎 Artefact Récupéré !",
          body: `Score : ${data.newScore}`,
          type: "success",
        };

        //Notification
        sendNotification('💎 Artefact Récupéré !', `Score : ${data.newScore}`)
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

  /** 1.3 Correction: Etalonnage et mise à jour du vecteur de calibration */
  function calibratePosition(targetLat: number, targetLng: number) {
    if (!lastRawPosition.value) return;
    calibrationVector.value = [
      targetLat - lastRawPosition.value[0],
      targetLng - lastRawPosition.value[1]
    ];
    // Met a jour immediatement le localPlayer
    localPlayer.value.position = [
      lastRawPosition.value[0] + calibrationVector.value[0],
      lastRawPosition.value[1] + calibrationVector.value[1]
    ];
    console.log(`🔧 Calibration ! Nouveau vecteur: [${calibrationVector.value[0]}, ${calibrationVector.value[1]}]`);
  }

  /** Fermer le message de jeu */
  function closeGameMessage() {
    gameMessage.value = null;
  }

  if (token.value) {
    startPolling();
  }

  return {
    // State
    gameMessage,
    isGameOver,
    isLocating,
    locationError,
    token,
    logged,
    login,
    isFetching,
    players,
    objects,
    zrr,
    calibrationVector,
    heading,
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
    calibratePosition,
    closeGameMessage,
  };
});
