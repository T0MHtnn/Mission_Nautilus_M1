import L from 'leaflet';
import { apiPath } from './config';
import { updateLatValue, updateLonValue, updateZoomValue } from './form';

let resourceLayer: L.LayerGroup;

// initialisation de la map
const lat = 45.782, lng = 4.8656, zoom = 19;

let mymap: L.Map;

// Initialisation de la map
function initMap() {
    mymap = L.map('map').setView([lat, lng], zoom);
    // Création d'un "tile layer" (permet l'affichage sur la carte)
    L.tileLayer('https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=pk.eyJ1IjoieGFkZXMxMDExNCIsImEiOiJjbGZoZTFvbTYwM29sM3ByMGo3Z3Mya3dhIn0.df9VnZ0zo7sdcqGNbfrAzQ', {
        maxZoom: 21,
        minZoom: 1,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
            '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
            'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        id: 'mapbox/streets-v11',
        tileSize: 512,
        zoomOffset: -1
    }).addTo(mymap);

    // Ajout d'un marker
    L.marker([45.78207, 4.86559]).addTo(mymap).bindPopup('Entrée du bâtiment<br>Nautibus.').openPopup();

    // Clic sur la carte
    mymap.on('click', (e: L.LeafletMouseEvent) => {
        updateMap(e.latlng, mymap.getZoom());
        updateLatValue(e.latlng.lat);
        updateLonValue(e.latlng.lng);
    });

    mymap.on('zoomend', () => {
        updateZoomValue(mymap.getZoom());
    });

    resourceLayer = L.layerGroup().addTo(mymap);
    return mymap;
}

// Mise à jour de la map
function updateMap(latlng: L.LatLngExpression, zoom: number): boolean {
    mymap.setView(latlng, zoom);

    return false;
}

async function fetchGameData() {
    try {
        const response = await fetch(`${apiPath}/api/resources`);
        const data = await response.json();

        resourceLayer.clearLayers();
        data.forEach((res: any) => {
            L.marker([res.lat, res.lon]).addTo(resourceLayer)
                .bindPopup(`Ressource: ${res.name}`);
        });
    } catch (e) {
        console.error("Erreur de récupération des données", e);
    }
}

// Lance la mise à jour toutes les 5 secondes
setInterval(fetchGameData, 5000);

export default initMap;