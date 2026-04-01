/**
 * Ce module gère le stockage et la récupération du token d'authentification.
 * On utilise le sessionStorage pour que la session se supprime si on rafraîchit la page.
 */

export function setToken(token: string): void {
    sessionStorage.setItem('admin_token', token);
}

export function getToken(): string | null {
    return sessionStorage.getItem('admin_token');
}

/**
 * Vérifie que le token est un token admin valide
 */
export function isAdmin(): boolean {
    const token = getToken();
    if (!token) return false;

    try {
        const parts = token.split(".");
        if (parts.length < 2) return false;

        const payload = JSON.parse(atob(parts[1]!));
        const species = (payload.species || "").toLowerCase();
        return species === "admin";
    } catch {
        return false;
    }
}

/**
 * Prépare le header Authorization pour les requêtes fetch.
 * Format standard : "Bearer <token>"
 */
export function getAuthHeader(): Record<string, string> {
    const token = getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
}

/**
 * Supprime le token (pour une déconnexion)
 */
export function logout(): void {
    sessionStorage.removeItem('admin_token');
}