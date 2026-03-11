<template>
  <section>
    <h2>Carte</h2>
    <p class="content">
      Joueurs : <strong>{{ store.players.length }}</strong> | Objets non
      découverts : <strong>{{ store.undiscoveredObjects.length }}</strong> |
      Objets découverts : <strong>{{ store.discoveredObjects.length }}</strong>
    </p>
    <div id="map" class="map" ref="map"></div>
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
let savedLat = 45.782;
let savedLng = 4.8656;
let savedZoom = 19;

// Icônes personnalisées
const playerIcon = (role: string) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${role === "explorateur" ? "#2196F3" : "#F44336"};
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);
    "></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const localPlayerIcon = L.divIcon({
  className: "custom-marker",
  html: `<div style="
    background: #4CAF50; width: 18px; height: 18px; border-radius: 50%;
    border: 3px solid white; box-shadow: 0 0 6px rgba(0,0,0,0.6);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const objectIcon = (discovered: boolean) =>
  L.divIcon({
    className: "custom-marker",
    html: `<div style="
      background: ${discovered ? "#FF9800" : "#9C27B0"};
      width: 12px; height: 12px;
      border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);
      ${discovered ? "border-radius: 2px;" : "border-radius: 50%;"}
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6],
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
      if (!zrr.defined || !zrr.limits) return;

      const bounds: L.LatLngBoundsExpression = [
        [zrr.limits.so[0], zrr.limits.so[1]],
        [zrr.limits.ne[0], zrr.limits.ne[1]],
      ];
      this.zrrRectangle = L.rectangle(bounds, {
        color: "#FF5722",
        weight: 3,
        fillOpacity: 0.05,
        dashArray: "10, 5",
      }).addTo(map);
      this.zrrRectangle.bindPopup("Zone de Recherche et Récupération (ZRR)");
    },

    /** Afficher les joueurs distants */
    drawPlayers() {
      const map = this.map as LeafletMap;
      // Supprimer les anciens
      for (const m of this.playerMarkers) m.remove();
      this.playerMarkers = [];

      for (const player of this.store.players) {
        const marker = L.marker([player.position[0], player.position[1]], {
          icon: playerIcon(player.role),
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
          icon: objectIcon(obj.discovered),
        }).addTo(map);

        const popupContent = obj.discovered
          ? `<strong>${obj.id}</strong><br>Type : ${obj.type}<br><em>Découvert</em>`
          : `<strong>${obj.id}</strong><br>Type : ???<br>TTL : ${Math.round(obj.ttl)}s`;

        marker.bindPopup(popupContent);
        this.objectMarkers.push(marker);
      }
    },

    /** Afficher le joueur local séparément */
    drawLocalPlayer() {
      const map = this.map as LeafletMap;
      const pos = this.store.localPlayer.position;

      if (this.localMarker) {
        this.localMarker.setLatLng([pos[0], pos[1]]);
      } else {
        this.localMarker = L.marker([pos[0], pos[1]], {
          icon: localPlayerIcon,
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
  },

  mounted() {
    const map = L.map(this.$refs.map as HTMLElement, {
      center: [savedLat, savedLng],
      zoom: savedZoom,
    });
    this.map = map;

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
    ).addTo(map);

    // Clic sur la carte
    map.on("click", (e: LeafletMouseEvent) => {
      savedLat = e.latlng.lat;
      savedLng = e.latlng.lng;
    });

    // Mémoriser le zoom
    map.on("zoomend", () => {
      savedZoom = map.getZoom();
    });

    // Premier affichage
    this.refreshAll();

    // Réagir aux changements du store (le polling est géré par le store)
    this.unwatchStore = this.store.$subscribe(() => {
      this.refreshAll();
    });
  },

  beforeUnmount() {
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
.map {
  height: 500px;
  width: 100%;
  border: 1px solid;
}
</style>
