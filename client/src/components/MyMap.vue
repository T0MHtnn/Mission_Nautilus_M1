<template>
  <section class="map-container">
    <p class="content">
      Joueurs : <strong>{{ store.players.length }}</strong> | Objets non
      découverts : <strong>{{ store.undiscoveredObjects.length }}</strong> |
      Objets découverts : <strong>{{ store.discoveredObjects.length }}</strong>
    </p>

    <div v-if="store.isLocating" class="gps-loading">
      <h2>🌍 Recherche du signal GPS en cours...</h2>
      <p>Veuillez patienter pendant que nous vous localisons.</p>
    </div>
    
    <div v-else-if="store.locationError" class="gps-error">
      <h2>❌ Erreur GPS : {{ store.locationError }}</h2>
      <p>Vous devez autoriser la géolocalisation pour jouer.</p>
      <button @click="store.startPolling()">Réessayer</button>
    </div>

    <div id="map" class="map" ref="map" v-show="!store.isLocating && !store.locationError"></div>

    <div
      v-if="store.gameMessage"
      class="game-overlay"
      :class="store.gameMessage.type"
    >
      <div class="modal">
        <h1>{{ store.gameMessage.title }}</h1>
        <p>{{ store.gameMessage.body }}</p>
        <button v-if="!store.isGameOver" @click="store.closeGameMessage()">
          Continuer
        </button>
        <button v-else @click="store.logout()" class="btn-quit">Quitter le jeu</button>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import type {
  LeafletMouseEvent,
  Map as LeafletMap,
  Marker,
  Rectangle,
} from "leaflet";
import { useGameStore } from "../stores/game";

// Coordonnées et zoom conservés entre montages
const savedLat = 45.782;
const savedLng = 4.8656;
let savedZoom = 19;

// Icônes personnalisées
const playerIcon = (role: string, heading: number = 0) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${role === "explorateur" ? "#2196F3" : "#F44336"};
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);
      transform: rotate(${heading}deg);
      display: flex; align-items: flex-start; justify-content: center;
    ">
      <div style="width: 0; height: 0; border-left: 4px solid transparent; border-right: 4px solid transparent; border-bottom: 6px solid white; margin-top: -6px;"></div>
    </div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const localPlayerIcon = (heading: number = 0) => L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background: #4CAF50; width: 18px; height: 18px; border-radius: 50%;
    border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.6);
    transform: rotate(${heading}deg);
    display: flex; align-items: flex-start; justify-content: center;
  ">
    <div style="width: 0; height: 0; border-left: 5px solid transparent; border-right: 5px solid transparent; border-bottom: 8px solid white; margin-top: -8px;"></div>
  </div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const objectIcon = (type: string, discovered: boolean) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="font-size: 20px; line-height: 1;">${type === 'creature' || type === 'monster' ? '👹' : '💎'}</div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

export default {
  name: "MyMap",
  data() {
    return {
      map: null as LeafletMap | null,
      playerMarkers: [] as Marker[],
      objectMarkers: [] as Marker[],
      localMarker: null as Marker | null,
      zrrRectangle: null as Rectangle | null,
      unwatchStore: null as (() => void) | null,
      wakeLock: null as any,
    };
  },
  computed: {
    store() {
      return useGameStore();
    },
  },
  methods: {
    updateMap() {
      if (!this.map) return;
      this.map.setView([savedLat, savedLng], savedZoom);
    },

    /** Dessiner la ZRR */
    drawZRR() {
      const map = this.map as LeafletMap;
      if (this.zrrRectangle) {
        this.zrrRectangle.remove();
        this.zrrRectangle = null;
      }
      const zrr = this.store.zrr;

      console.log("🗺️ [MAP] Tentative de dessin ZRR. État dans le store:", {
        defined: zrr.defined,
        hasLimits: !!zrr.limits,
      });

      if (!zrr.defined || !zrr.limits) {
        console.log("ZRR non définie ou sans limites");
        return;
      }
      console.log(
        "📍 [MAP] Points de dessin (SO/NE):",
        zrr.limits.so,
        zrr.limits.ne,
      );

      const bounds: L.LatLngBoundsExpression = [
        [zrr.limits.so[0], zrr.limits.so[1]],
        [zrr.limits.ne[0], zrr.limits.ne[1]],
      ];
      this.zrrRectangle = L.rectangle(bounds, {
        color: "#FF5722",
        weight: 3,
        fillOpacity: 0.05,
        dashArray: "10, 5",
        interactive: false,
      }).addTo(map);
      this.zrrRectangle.bindPopup("Zone de Recherche et Récupération (ZRR)");
    },

    /** Afficher les joueurs distants */
    drawPlayers() {
      const map = this.map as LeafletMap;
      // Supprimer les anciens
      for (const m of this.playerMarkers) m.remove();
      this.playerMarkers = [];

      const myId = this.store.localPlayer.id.toLowerCase();

      const remotePlayers = this.store.players.filter(
        (p) => p.id.toLowerCase() !== myId,
      );

      for (const player of remotePlayers) {
        // En l'absence de cap fourni dans les données distantes, on suppose 0 par défaut pour les autres
        const marker = L.marker([player.position[0], player.position[1]], {
          icon: playerIcon(player.role, 0),
        }).addTo(map);
        marker.bindPopup(
          `<strong>${player.id}</strong><br>` +
            `Rôle : ${player.role}<br>` +
            `Score : ${player.score}`,
        );
        this.playerMarkers.push(marker);
      }
    },

    /** Afficher les objets (découverts et non découverts) */
    drawObjects() {
      const map = this.map as LeafletMap;
      for (const m of this.objectMarkers) m.remove();
      this.objectMarkers = [];

      for (const obj of this.store.objects) {
        const marker = L.marker([obj.position[0], obj.position[1]], {
          icon: objectIcon(obj.type, obj.discovered),
        }).addTo(map);

        let popupContent = "";

        if (obj.discovered) {
          popupContent = `<strong>${obj.id}</strong><br>Type : ${obj.type}<br><em>Récupéré</em>`;
        } else {
          const isMonster = ["creature", "monster"].includes(obj.type.toLowerCase());
          popupContent = `<strong>${isMonster ? '⚠️ Danger' : 'Objet Inconnu'}</strong><br>` +
                        `TTL : ${Math.round(obj.ttl)}s`;
        }

        marker.bindPopup(popupContent);
        this.objectMarkers.push(marker);
      }
    },

    /** Afficher le joueur local séparément */
    drawLocalPlayer() {
      const map = this.map as LeafletMap;
      const pos = this.store.localPlayer.position;
      const heading = this.store.heading; // Cap actuel de la boussole ou du mouvement GPS

      if (this.localMarker) {
        this.localMarker.setLatLng([pos[0], pos[1]]);
        // On met à jour l'icône complètement pour appliquer la rotation
        this.localMarker.setIcon(localPlayerIcon(heading));
      } else {
        this.localMarker = L.marker([pos[0], pos[1]], {
          icon: localPlayerIcon(heading),
          zIndexOffset: 1000,
        }).addTo(map);
        this.localMarker.bindPopup(
          `<strong>Vous (${this.store.localPlayer.id})</strong><br>` +
            `Rôle : ${this.store.localPlayer.role}`,
        );
      }
    },

    /** Rafraîchir tous les éléments */
    refreshAll() {
      if (!this.map) return;
      this.drawZRR();
      this.drawPlayers();
      this.drawObjects();
      this.drawLocalPlayer();
    },

    /** Gérer le Wake Lock pour empêcher l'écran de se mettre en veille */
    async requestWakeLock() {
      try {
        if ("wakeLock" in navigator) {
          this.wakeLock = await (navigator as any).wakeLock.request("screen");
          console.log("🔒 Wake Lock activé: l'écran restera allumé.");
          this.wakeLock.addEventListener("release", () => {
            console.log("🔓 Wake Lock relâché: l'écran peut s'éteindre.");
          });
        }
      } catch (err: any) {
        console.error(`Erreur WakeLock: ${err.name}, ${err.message}`);
      }
    },

    releaseWakeLock() {
      if (this.wakeLock !== null) {
        this.wakeLock.release().then(() => {
          this.wakeLock = null;
        });
      }
    },

    handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        this.requestWakeLock();
      }
    }
  },

  async mounted() {
    await this.$nextTick();
    const mapElement = this.$refs.map as HTMLElement;

    if (!mapElement) return;

    if (this.map) {
      this.map.remove();
    }

    this.map = L.map(mapElement, {
      center: [savedLat, savedLng],
      zoom: savedZoom,
      inertia: false,
    });

    // Tile layer
    L.tileLayer(
      "https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=pk.eyJ1IjoieGFkZXMxMDExNCIsImEiOiJjbGZoZTFvbTYwM29sM3ByMGo3Z3Mya3dhIn0.df9VnZ0zo7sdcqGNbfrAzQ",
      {
        maxZoom: 22,
        minZoom: 1,
        attribution:
          'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
          '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
          'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        tileSize: 512,
        zoomOffset: -1,
      },
    ).addTo(this.map as LeafletMap);

    // Variables pour l'appui long (calibration GPS)
    let pressTimer: ReturnType<typeof setTimeout>;

    // Clic simple pour debugger/tester
    this.map.on("click", (e: LeafletMouseEvent) => {
      if (this.store.isGameOver) return;
      // Optionnel: On peut désactiver le clic pour modifier la position
      // ou le laisser pour le débogage seulement
    });

    // Appui long / Context menu pour calibrer
    this.map.on("contextmenu", (e: LeafletMouseEvent) => {
      const rawPos = this.store.localPlayer.position;
      this.store.calibratePosition(rawPos[0], rawPos[1]);
      alert(`Calibration réinitialisée à votre position GPS actuelle`);
    });

    // Pour mobile, on implémente un timer mousedown/mouseup
    this.map.on("mousedown touchstart", (e: any) => {
      const latlng = e.latlng;
      if (!latlng) return;
      
      pressTimer = setTimeout(() => {
        this.store.calibratePosition(latlng.lat, latlng.lng);
        alert(`Calibration mobile enregistrée : ${latlng.lat.toFixed(5)}, ${latlng.lng.toFixed(5)}`);
      }, 1000);
    });

    this.map.on("mouseup mousemove touchend touchmove", () => {
      clearTimeout(pressTimer);
    });

    // Mémoriser le zoom
    this.map.on("zoomend", () => {
      if (this.map) {
        savedZoom = this.map.getZoom();
      }
    });

    setTimeout(() => {
      if (this.map) {
        this.map.invalidateSize();
        console.log("✅ Carte recalculée et affichée");
      }
    }, 200);

    // Premier affichage
    this.refreshAll();

    // Réagir aux changements du store (le polling est géré par le store)
    this.unwatchStore = this.store.$subscribe(() => {
      this.refreshAll();
    });

    // Activer le mode Wake Lock
    this.requestWakeLock();
    
    // Gérer le changement de visibilité (le navigateur relâche le wakelock quand l'onglet est caché)
    document.addEventListener("visibilitychange", this.handleVisibilityChange);
  },

  beforeUnmount() {
    // Relâcher le Wake Lock
    this.releaseWakeLock();
    document.removeEventListener("visibilitychange", this.handleVisibilityChange);

    // Nettoyer le watcher
    if (this.unwatchStore) {
      this.unwatchStore();
      this.unwatchStore = null;
    }
    for (const m of this.playerMarkers) m.remove();
    for (const m of this.objectMarkers) m.remove();
    if (this.localMarker) this.localMarker.remove();
    if (this.zrrRectangle) this.zrrRectangle.remove();
    this.playerMarkers = [];
    this.objectMarkers = [];
    this.localMarker = null;
    this.zrrRectangle = null;

    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  },
};
</script>

<style scoped>
.map-container {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 100px); /* Occupe la hauteur de l'écran moins le header/nav potentiel */
  width: 100%;
}

.map {
  flex: 1; /* Prend tout l'espace restant disponible */
  width: 100%;
  border: 1px solid #ccc;
  border-radius: 8px;
  overflow: hidden;
}

.content {
  margin-bottom: 10px;
}

.gps-loading, .gps-error {
  flex: 1;
  width: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #f9f9f9;
  border: 1px solid #ccc;
  border-radius: 8px;
  text-align: center;
  padding: 20px;
}

.gps-error {
  background-color: #ffebee;
  color: #c62828;
  border-color: #ef9a9a;
}

.gps-error button {
  margin-top: 15px;
  padding: 10px 20px;
  background-color: #d32f2f;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

.map-container {
  position: relative;
  width: 100%;
}

.game-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99999;
}

.modal {
  background: #2c3e50;
  color: white;
  padding: 2rem;
  border-radius: 15px;
  box-shadow: 0 0 20px rgba(0,0,0,0.5);
  text-align: center;
  max-width: 80%;
}

.game-overlay.error .modal {
  border: 3px solid #ff4d4d;
}

.game-overlay.success .modal {
  border-color: #42b883;
}

.success h1 {
  color: #42b883;
}
.error h1 {
  color: #ff4d4d;
}

.modal button {
  margin-top: 1rem;
  padding: 10px 20px;
  background: #42b883;
  color: white;
  border: none;
  cursor: pointer;
}

.modal button.btn-quit {
  background: #666;
}
</style>
