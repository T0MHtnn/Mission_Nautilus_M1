//Import des CSS (Webpack va les packager)
import 'leaflet/dist/leaflet.css'; // Le CSS officiel de Leaflet
import './css/style.css';

// Import de ta logique
import mapInit from './map';
import formInit from './form';

const mymap = mapInit();
formInit(mymap);