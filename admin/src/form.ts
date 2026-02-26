import { apiPath } from './config';

// Initialisation
function initListeners(mymap: L.Map): void {

    const btnSetZrr = document.getElementById("setZrrButton");
    if (btnSetZrr) {
        btnSetZrr.addEventListener("click", () => setZrr(mymap.getBounds()));
    }

    const btnSendZrr = document.getElementById("sendZrrButton");
    if (btnSendZrr) {
        btnSendZrr.addEventListener("click", () => sendZrr());
    }

    const btnSetTtl = document.getElementById("setTtlButton");
    if (btnSetTtl) {
        btnSetTtl.addEventListener("click", () => setTtl());
    }
}

export function initPositionListeners(mymap: L.Map): void {
    const latInput = document.getElementById("lat") as HTMLInputElement;
    const lonInput = document.getElementById("lon") as HTMLInputElement;
    const zoomInput = document.getElementById("zoom") as HTMLInputElement;

    const updateFromInputs = () => {
        const lat = parseFloat(latInput.value);
        const lon = parseFloat(lonInput.value);
        const zoom = parseInt(zoomInput.value);
        if (!isNaN(lat) && !isNaN(lon)) {
            mymap.setView([lat, lon], zoom);
        }
    };

    latInput.addEventListener("change", updateFromInputs);
    lonInput.addEventListener("change", updateFromInputs);
    zoomInput.addEventListener("input", () => {
        updateFromInputs();
        (document.getElementById("zoomValue") as HTMLElement).innerText = zoomInput.value;
    });
}

// MàJ des inputs du formulaire
function updateLatValue(lat: number): void {
    const input = document.getElementById("lat") as HTMLInputElement;
    if (input) input.value = lat.toString();
}

function updateLonValue(lng: number): void {
    const input = document.getElementById("lon") as HTMLInputElement;

    if (input) input.value = lng.toString();
}

function updateZoomValue(zoom: number): void {
    const input = document.getElementById("zoom") as HTMLInputElement;
    if (input) input.value = zoom.toString();
}

function setZrr(bounds: L.LatLngBounds | null): void {
    if (bounds) {
        const sw = bounds.getSouthWest();
        const ne = bounds.getNorthEast();

        (document.getElementById("lat1") as HTMLInputElement).value = sw.lat.toString();
        (document.getElementById("lon1") as HTMLInputElement).value = sw.lng.toString();
        (document.getElementById("lat2") as HTMLInputElement).value = ne.lat.toString();
        (document.getElementById("lon2") as HTMLInputElement).value = ne.lng.toString();
    }
}

// Requêtes asynchrones
async function sendZrr() {
    const data = {
        lat1: (document.getElementById("lat1") as HTMLInputElement).value,
        lon1: (document.getElementById("lon1") as HTMLInputElement).value,
        lat2: (document.getElementById("lat2") as HTMLInputElement).value,
        lon2: (document.getElementById("lon2") as HTMLInputElement).value
    };

    try {
        const response = await fetch(`${apiPath}/admin/zrr`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (response.ok) {
            alert("ZRR envoyée avec succès !");
        }
    } catch (e) {
        console.error("Erreur lors de l'envoi ZRR", e);
    }
}

async function setTtl() {
    const ttlValue = (document.getElementById("ttl") as HTMLInputElement).value;

    try {
        const response = await fetch(`${apiPath}/admin/ttl`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ttl: parseInt(ttlValue) })
        });

        if (response.ok) {
            alert("TTL mis à jour !");
        }
    } catch (e) {
        console.error("Erreur lors de l'envoi TTL", e);
    }
}

export { updateLatValue, updateLonValue, updateZoomValue };
export default initListeners;