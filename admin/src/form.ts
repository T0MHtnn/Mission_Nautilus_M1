// Initialisation
function initListeners(mymap: L.Map): void {
    console.log("TODO: add more event listeners...");

    document.getElementById("setZrrButton").addEventListener("click", () => {
        setZrr(mymap.getBounds());
    });

    document.getElementById("sendZrrButton").addEventListener("click", () => {
        sendZrr();
    });

    document.getElementById("setTtlButton").addEventListener("click", () => {
        setTtl();
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
        const response = await fetch('http://localhost:3000/admin/zrr', {
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
        const response = await fetch('http://localhost:3000/admin/ttl', {
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