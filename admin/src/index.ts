import 'leaflet/dist/leaflet.css';
import './css/style.css';

import mapInit from './map';
import initListeners, { initPositionListeners, initAdminRoutesListeners } from './form';
import { getToken } from './auth';
import L from 'leaflet';


L.Icon.Default.mergeOptions({
    iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
    iconUrl: require('leaflet/dist/images/marker-icon.png'),
    shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

async function init() {
    // Vérification de sécurité
    if (!getToken()) {
        window.location.href = "login.html";
        return;
    }

    const mymap = mapInit();
    // Initialisation des écouteurs de boutons (Set ZRR, Send, etc.)
    initListeners(mymap);
    // Initialisation des écouteurs sur les champs de saisie
    initPositionListeners(mymap);
    // Activation des routes admin
    initAdminRoutesListeners();
}

init();
