import L from 'leaflet';
import { apiPath } from './config';
import { updateLatValue, updateLonValue, updateZoomValue } from './form';
import { getAuthHeader } from './auth';

let resourceLayer: L.LayerGroup;

// initialisation de la map
const lat = 45.782, lng = 4.8656, zoom = 19;

let mymap: L.Map;

const token = localStorage.getItem('admin_token');
if (token) {
    console.log("🚀 Admin détecté, redémarrage du polling...");

    fetchGameData();

    setInterval(fetchGameData, 2000);
}


//Icon Rival
const rivalIcon = L.divIcon({
    html: `<div style="font-size: 24px;">🥷</div>`,
    className: 'player-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

//Icon Explorateur
const exploIcon = L.divIcon({
    html: `<div style="font-size: 24px;">🤠</div>`,
    className: 'player-icon',
    iconSize: [30, 30],
    iconAnchor: [15, 15]
});

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
    const auth = getAuthHeader();
    if (Object.keys(auth).length === 0) {
        return;
    }

    try {
        const response = await fetch(`${apiPath}/game/resources`, {
            method: 'GET',
            headers: {
                ...getAuthHeader(),
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.error(`Erreur API (${response.status}):`, await response.text());
            return;
        }

        const data = await response.json();
        resourceLayer.clearLayers();

        // 1. On affiche les objets (ressources)
        if (data.objects && Array.isArray(data.objects)) {
            data.objects.forEach((obj: any) => {
                let emoji = '❓';
                let color = '#ccc';

                const type = (obj.type && obj.type.toString().trim() !== "")
                    ? obj.type.toString().toLowerCase().trim()
                    : "inconnu";

                switch (type) {
                    case 'artefact':
                    case 'artifact':
                        emoji = '💎';
                        color = '#00d4ff';
                        break;
                    case 'creature':
                    case 'monster':
                    case 'monstre':
                        emoji = '👹';
                        color = '#ff4d4d';
                        break;
                    case 'tresor':
                    case 'treasure':
                    case 'coffre':
                        emoji = '💰';
                        color = '#ffd700';
                        break;
                }

                const emojiIcon = L.divIcon({
                    html: `<div style="
            font-size: 24px; 
            display: flex; 
            justify-content: center; 
            align-items: center;
            filter: drop-shadow(0 0 2px black);
            background: rgba(255,255,255,0.3);
            border-radius: 100%;
            width: 32px;
            height: 32px;
            border: 2px solid ${color};
        ">${emoji}</div>`,
                    className: 'custom-emoji-icon',
                    iconSize: [32, 32],
                    iconAnchor: [16, 16]
                });

                L.marker([obj.position[0], obj.position[1]], { icon: emojiIcon })
                    .addTo(resourceLayer)
                    .bindPopup(`
            <strong>${type.toUpperCase()}</strong><br>
            ID: ${obj.id}<br>
            TTL: ${Math.round(obj.ttl)}s
        `);
            });
        }

        // 2. On affiche aussi les joueurs pour l'admin !
        if (data.players && Array.isArray(data.players)) {
            data.players.forEach((p: any) => {
                const iconToUse = p.role === 'rival' ? rivalIcon : exploIcon;

                L.marker([p.position[0], p.position[1]], { icon: iconToUse })
                    .addTo(resourceLayer)
                    .bindPopup(`
                <strong>Joueur: ${p.id}</strong><br>
                Rôle: ${p.role}<br>
                Score: ${p.score}
            `);
            });
        }
    } catch (e) {
        console.error("Erreur de récupération des données", e);
    }
}

// Lance la mise à jour toutes les 5 secondes
setInterval(fetchGameData, 5000);

export default initMap;