// Import des CSS
import 'leaflet/dist/leaflet.css';
import './css/style.css';

import mapInit from './map';
import formInit, { initPositionListeners } from './form';

const mymap = mapInit();

// Initialisation des écouteurs de boutons (Set ZRR, Send, etc.)
formInit(mymap);

// Initialisation des écouteurs sur les champs de saisie
initPositionListeners(mymap);