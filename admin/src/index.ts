import 'leaflet/dist/leaflet.css';
import './css/style.css';
import L from 'leaflet';

import mapInit from './map';
import initListeners, { initPositionListeners, initAdminRoutesListeners } from './form';
import { isAdmin } from './auth';

async function init() {

    // Vérification de sécurité: doit être connecté ET être admin
    if (!isAdmin()) {
        alert("Accès refusé. Seuls les admins peuvent accéder à cette interface.");
        window.location.replace("login.html");
        return;
    }

    const mymap = mapInit();

    const defaultIcon = L.divIcon({
        html: `<div style="font-size: 20px; line-height: 1;">📍</div>`,
        className: 'custom-div-icon',
        iconSize: [20, 20],
        iconAnchor: [10, 20]
    });
    L.marker([45.78207, 4.86559], { icon: defaultIcon })
        .addTo(mymap)
        .bindPopup('Entrée du bâtiment<br>Nautibus.')
        .openPopup();

    // Initialisation des écouteurs de boutons (Set ZRR, Send, etc.)
    initListeners(mymap);
    // Initialisation des écouteurs sur les champs de saisie
    initPositionListeners(mymap);
    // Activation des routes admin
    initAdminRoutesListeners();
}

window.addEventListener('pageshow', (event) => {
    if (!isAdmin()) {
        window.location.replace("login.html");
    }
});

init();
