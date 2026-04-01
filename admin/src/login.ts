import './css/style.css';
import { setToken } from './auth';

const btnLogin = document.getElementById("loginButton");

if (btnLogin) {
    btnLogin.addEventListener("click", async () => {
        const loginValue = (document.getElementById("adminLogin") as HTMLInputElement).value;
        const passwordValue = (document.getElementById("adminPassword") as HTMLInputElement).value;

        console.log("Tentative de connexion pour :", loginValue, " , ", passwordValue);

        try {
            const response = await fetch("http://localhost:8080/login", {
                method: "POST",
                headers: { "Content-Type": "application/json", "Origin": "http://localhost:3306" },
                body: JSON.stringify({
                    login: loginValue,
                    password: passwordValue
                })
            });

            if (response.status === 204) {

                const token = response.headers.get("Authorization");
                if (token) {
                    setToken(token.replace("Bearer ", ""));
                    alert("Connexion réussie !");
                    window.location.href = "index.html";
                } else {
                    alert("Erreur : Le serveur n'a pas renvoyé de token.");
                }
            } else if (response.status === 401) {
                alert("Identifiants incorrects (401).");
            } else {
                alert("Erreur serveur : " + response.status);
            }
        } catch (e) {
            console.error("Erreur de connexion au JAR Java", e);
            alert("Impossible de contacter le serveur d'authentification (port 8080).");
        }
    });
}

// Gestion de la touche Entrée
window.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        document.getElementById("loginButton")?.click();
    }
});