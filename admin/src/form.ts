import L from 'leaflet';
import { apiPath } from './config';
import { getAuthHeader, setToken } from './auth';

let zrrLayer: L.Rectangle | null = null;

// Initialisation
function initListeners(mymap: L.Map): void {

    const btnSetZrr = document.getElementById("setZrrButton");
    if (btnSetZrr) {
        btnSetZrr.addEventListener("click", () => setZrr(mymap));
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

function setZrr(mymap: L.Map): void {
    const lat1 = parseFloat((document.getElementById("lat1") as HTMLInputElement).value);
    const lon1 = parseFloat((document.getElementById("lon1") as HTMLInputElement).value);
    const lat2 = parseFloat((document.getElementById("lat2") as HTMLInputElement).value);
    const lon2 = parseFloat((document.getElementById("lon2") as HTMLInputElement).value);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        alert("Coordonnées de la ZRR invalides ou incomplètes.");
        return;
    }

    const corner1 = L.latLng(lat1, lon1);
    const corner2 = L.latLng(lat2, lon2);
    const bounds = L.latLngBounds(corner1, corner2);

    if (zrrLayer) {
        zrrLayer.remove();
    }

    zrrLayer = L.rectangle(bounds, {
        color: "#ff0000",
        weight: 3,
        fillColor: "#ff0000",
        fillOpacity: 0.2
    }).addTo(mymap);

    mymap.fitBounds(bounds);
}

// Requêtes asynchrones
async function sendZrr() {

    const lat1 = parseFloat((document.getElementById("lat1") as HTMLInputElement).value);
    const lon1 = parseFloat((document.getElementById("lon1") as HTMLInputElement).value);
    const lat2 = parseFloat((document.getElementById("lat2") as HTMLInputElement).value);
    const lon2 = parseFloat((document.getElementById("lon2") as HTMLInputElement).value);

    if (isNaN(lat1) || isNaN(lon1) || isNaN(lat2) || isNaN(lon2)) {
        alert("Coordonnées invalides");
        return;
    }

    const data = {
        p1: [lat1, lon1],
        p2: [lat2, lon2]
    };

    try {
        const response = await fetch(`${apiPath}/admin/zrr`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
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
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader()
            },
            body: JSON.stringify({ ttl: parseInt(ttlValue) })
        });

        if (response.ok) {
            alert("TTL mis à jour !");
        }
    } catch (e) {
        console.error("Erreur lors de l'envoi TTL", e);
    }
}

async function fetchPlayersList() {
    try {
        const response = await fetch(`${apiPath}/admin/status`, {
            headers: getAuthHeader()
        });

        if (response.ok) {
            const data = await response.json();
            const players: string[] = data.players; // On attend un tableau de logins

            const select = document.getElementById("playerLogin") as HTMLSelectElement;
            if (!select) return;

            // On garde seulement la première option par défaut
            select.innerHTML = '<option value="">-- Sélectionner un agent --</option>';

            players.forEach(login => {
                const opt = document.createElement('option');
                opt.value = login;
                opt.innerText = login;
                select.appendChild(opt);
            });
        }
    } catch (e) {
        console.error("Erreur lors de la récupération des joueurs", e);
    }
}

export function initAdminRoutesListeners(): void {
    fetchPlayersList();

    // --- CONNEXION / LOGIN ---
    const btnLogin = document.getElementById("loginButton");
    if (btnLogin) {
        btnLogin.addEventListener("click", async () => {
            const login = (document.getElementById("adminLogin") as HTMLInputElement).value;
            const password = (document.getElementById("adminPassword") as HTMLInputElement).value;

            try {
                // On appelle le JAR Java (via le proxy ou direct si CORS ok)
                const response = await fetch("http://localhost:8080/auth/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ login: login, password: password })
                });

                if (response.ok) {
                    const data = await response.json();

                    // On stocke le VRAI JWT
                    setToken(data.token);

                    // On quitte la page de login immédiatement pour charger l'index
                    window.location.href = "index.html";
                } else {
                    alert("Identifiants incorrects ou accès refusé par le serveur d'auth.");
                }
            } catch (e) {
                console.error("Erreur de connexion au JAR Java", e);
                alert("Impossible de contacter le serveur d'authentification (8080).");
            }
        });
    }

    // --- DÉCONNEXION / LOGOUT ---
    const btnLogout = document.getElementById("logoutButton");
    if (btnLogout) {
        btnLogout.addEventListener("click", () => {
            localStorage.removeItem('admin_token');
            window.location.href = 'login.html';
        });
    }

    // --- REFRESH ---
    const btnRefreshPlayers = document.getElementById("refreshPlayersButton");
    if (btnRefreshPlayers) {
        btnRefreshPlayers.addEventListener("click", fetchPlayersList);
    }

    // --- ASSIGNER UN RÔLE ---
    const btnSetRole = document.getElementById("setRoleButton");
    if (btnSetRole) {
        btnSetRole.addEventListener("click", () => {
            const login = (document.getElementById("playerLogin") as HTMLInputElement).value;
            const role = (document.getElementById("playerRole") as HTMLSelectElement).value;

            if (!login) {
                alert("Veuillez choisir un agent.");
                return;
            }
            sendAdminRequest('/admin/species', 'POST', { login, role });
        });
    }

    // --- SPAWN OBJET ---
    const btnSpawn = document.getElementById("spawnObjectButton");
    if (btnSpawn) {
        btnSpawn.addEventListener("click", () => {
            const lat = parseFloat((document.getElementById("lat") as HTMLInputElement).value);
            const lon = parseFloat((document.getElementById("lon") as HTMLInputElement).value);
            const type = (document.getElementById("objectType") as HTMLSelectElement).value;

            if (isNaN(lat) || isNaN(lon)) {
                alert("Veuillez sélectionner un point sur la carte d'abord.");
                return;
            }
            sendAdminRequest('/admin/spawn-object', 'POST', { position: [lat, lon], type });
        });
    }

    // --- ACTUALISER LE STATUT ---
    const btnStatus = document.getElementById("refreshStatusButton");
    if (btnStatus) {
        btnStatus.addEventListener("click", updateStatus);
    }
}

async function sendAdminRequest(endpoint: string, method: string, body: any) {
    try {
        const response = await fetch(`${apiPath}${endpoint}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeader() // Utilise le token stocké
            },
            body: JSON.stringify(body)
        });
        const result = await response.json();
        if (response.ok) {
            alert(`Succès: ${result.status}`);
        } else {
            alert(`Erreur API: ${result.error}`);
        }
    } catch (e) {
        console.error(`Erreur lors de la requête vers ${endpoint}`, e);
        alert("Erreur de connexion au serveur.");
    }
}

async function updateStatus() {
    try {
        const response = await fetch(`${apiPath}/admin/status`, {
            headers: getAuthHeader()
        });
        if (!response.ok) throw new Error("Non autorisé ou serveur injoignable");

        const data = await response.json();
        const statusDiv = document.getElementById("gameStatusDisplay");
        if (statusDiv) {
            statusDiv.innerHTML = `
                Objets: ${data.objectCount} | 
                Joueurs: ${data.playerCount} <br>
                (Explo: ${data.playersByRole.explorateur} | Riva: ${data.playersByRole.rival})
            `;
        }
    } catch (e) {
        console.error("Erreur status", e);
    }
}

export { updateLatValue, updateLonValue, updateZoomValue };
export default initListeners;