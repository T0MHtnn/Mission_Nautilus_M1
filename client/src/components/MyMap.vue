<template>
  <section>
    <h2>Carte</h2>
    <p class="content">
      <strong>TODO :</strong> mettre à jour les positions des différents objets sur la carte.
    </p>
    <div id="map" class="map" ref="map"></div>
  </section>
</template>

<script lang="ts">
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import type { LeafletMouseEvent, Map as LeafletMap, Marker } from 'leaflet'

// Coordonnées et zoom mémorisés entre les montages/démontages du composant
let lat = 45.782
let lng = 4.8656
let currentZoom = 19

// Données des markers à recréer à chaque montage
const markersData: Array<{ lat: number; lng: number; popup?: string }> = [
  { lat: 45.78207, lng: 4.86559, popup: 'Entrée du bâtiment<br><strong>Nautibus</strong>.' },
]

export default {
  name: 'MyMap',
  data() {
    return {
      map: null as LeafletMap | null,
      markers: [] as Marker[],
    }
  },
  methods: {
    updateMap() {
      if (!this.map) return false
      this.map.setView([lat, lng], currentZoom)
      return false
    },
    createMarkers() {
      if (!this.map) return
      const map = this.map as LeafletMap
      for (const data of markersData) {
        const marker = L.marker([data.lat, data.lng]).addTo(map)
        if (data.popup) marker.bindPopup(data.popup).openPopup()
        this.markers.push(marker)
      }
    },
    removeMarkers() {
      for (const marker of this.markers) {
        marker.remove()
      }
      this.markers = []
    },
  },
  mounted() {
    // Créer la map lors du montage (le DOM existe)
    const map = L.map(this.$refs.map as HTMLElement, {
      center: [lat, lng],
      zoom: currentZoom,
    })
    this.map = map

    // Tile layer
    L.tileLayer(
      'https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=pk.eyJ1IjoieGFkZXMxMDExNCIsImEiOiJjbGZoZTFvbTYwM29sM3ByMGo3Z3Mya3dhIn0.df9VnZ0zo7sdcqGNbfrAzQ',
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
    ).addTo(map)

    // Recréer les markers
    this.createMarkers()

    // Clic sur la carte : mémorise les coordonnées
    map.on('click', (e: LeafletMouseEvent) => {
      lat = e.latlng.lat
      lng = e.latlng.lng
      this.updateMap()
    })

    // Mémoriser le zoom quand l'utilisateur le change
    map.on('zoomend', () => {
      currentZoom = map.getZoom()
    })
  },
  beforeUnmount() {
    // Nettoyer les markers et détruire la map quand le routeur désactive le composant
    this.removeMarkers()
    if (this.map) {
      this.map.remove()
      this.map = null
    }
  },
}
</script>

<style scoped>
.map {
  height: 400px;
  width: 100%;
  border: 1px solid;
}
</style>
