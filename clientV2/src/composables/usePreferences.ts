export interface Preferences {
    theme: 'light' | 'dark' | 'auto'
    fontSize: 'small' | 'normal' | 'large'
    language: 'fr' | 'en'
}

const STORAGE_PREFIX = 'zanzibar_pref_'

const defaultPrefs: Preferences = {
    theme: 'auto',
    fontSize: 'normal',
    language: 'fr'
}

export const translations = {
    fr: {
        welcome: 'Bienvenue sur Zanzibar Mobile',
        welcomeConnected: 'Vous êtes connecté - Interface Rival',
        connectPrompt: 'Connectez-vous pour commencer à jouer.',
        map: 'Carte Zanzibar',
        profile: 'Mon profil',
        logout: 'Se déconnecter',
        save: 'Enregistrer',
        score: 'Score',
        role: 'Role',
        position: 'Position',
        login: 'Connexion',
        loginLoading: 'Connexion...',
        loginButton: 'Se connecter',
        username: 'Identifiant',
        password: 'Mot de passe',
        gpsSearching: '🌍 Recherche du signal GPS en cours...',
        gpsWait: 'Veuillez patienter pendant que nous vous localisons.',
        gpsError: '❌ Erreur GPS',
        gpsAllow: 'Vous devez autoriser la géolocalisation pour jouer.',
        gpsRetry: 'Réessayer',
        players: 'Joueurs',
        undiscovered: 'Objets non découverts',
        discovered: 'Objets découverts',
        themeLabel: 'Thème',
        themeAuto: 'Automatique (luminosité)',
        themeLight: 'Clair',
        themeDark: 'Sombre',
        fontSizeLabel: 'Taille de police',
        fontSmall: 'Petite',
        fontNormal: 'Normale',
        fontLarge: 'Grande',
        languageLabel: 'Langue',
        profileTitle: 'Mon profil',
        profileUser: 'Utilisateur',
        profileImageUrl: "URL de l'image de profil",
        profileNewPassword: 'Nouveau mot de passe',
        profileConfirmPassword: 'Confirmer le mot de passe',
        profileSave: 'Enregistrer',
        profileSuccess: 'Profil mis à jour avec succès',
        profileError: 'Erreur lors de la mise à jour du profil',
        stats: 'Statistiques',
        continue: 'Continuer',
        quit: 'Quitter le jeu',
        homeLink: 'Accueil',
        mapLink: 'Carte',
        profilePasswordPlaceholder: 'Laisser vide pour ne pas changer',
    },
    en: {
        welcome: 'Welcome to Zanzibar Mobile',
        welcomeConnected: 'Connected - Rival Interface',
        connectPrompt: 'Log in to start playing.',
        map: 'Zanzibar Map',
        profile: 'My profile',
        logout: 'Log out',
        save: 'Save',
        score: 'Score',
        role: 'Role',
        position: 'Position',
        login: 'Login',
        loginLoading: 'Logging in...',
        loginButton: 'Log in',
        username: 'Username',
        password: 'Password',
        gpsSearching: '🌍 Searching for GPS signal...',
        gpsWait: 'Please wait while we locate you.',
        gpsError: '❌ GPS Error',
        gpsAllow: 'You must allow geolocation to play.',
        gpsRetry: 'Retry',
        players: 'Players',
        undiscovered: 'Undiscovered objects',
        discovered: 'Discovered objects',
        themeLabel: 'Theme',
        themeAuto: 'Automatic (brightness)',
        themeLight: 'Light',
        themeDark: 'Dark',
        fontSizeLabel: 'Font size',
        fontSmall: 'Small',
        fontNormal: 'Normal',
        fontLarge: 'Large',
        languageLabel: 'Language',
        profileTitle: 'My profile',
        profileUser: 'Username',
        profileImageUrl: 'Profile image URL',
        profileNewPassword: 'New password',
        profileConfirmPassword: 'Confirm password',
        profileSave: 'Save',
        profileSuccess: 'Profile updated successfully',
        profileError: 'Error updating profile',
        stats: 'Statistics',
        continue: 'Continue',
        quit: 'Quit game',
        homeLink: 'Home',
        mapLink: 'Map',
        profilePasswordPlaceholder: 'Leave blank to keep unchanged',
    }
}

import { ref } from 'vue'
export const currentLanguage = ref<'fr' | 'en'>('fr')
export const t = (key: keyof typeof translations['fr']) =>
    translations[currentLanguage.value][key]

export function usePreferences(userId?: string) {
    const key = (pref: string) =>
        `${STORAGE_PREFIX}${userId || 'default'}_${pref}`

    function savePreference<K extends keyof Preferences>(
        pref: K,
        value: Preferences[K]
    ) {
        localStorage.setItem(key(pref), value)
        applyPreference(pref, value)
    }

    function loadPreferences() {
        for (const pref of Object.keys(defaultPrefs) as (keyof Preferences)[]) {
            const saved = localStorage.getItem(key(pref)) as Preferences[typeof pref] | null
            applyPreference(pref, saved || defaultPrefs[pref])
        }
    }

    function getPreference<K extends keyof Preferences>(pref: K): Preferences[K] {
        return (localStorage.getItem(key(pref)) as Preferences[K]) || defaultPrefs[pref]
    }

    function applyPreference<K extends keyof Preferences>(pref: K, value: Preferences[K]) {
        if (pref === 'fontSize') {
            const sizes = { small: '13px', normal: '15px', large: '18px' }
            document.body.style.fontSize = sizes[value as Preferences['fontSize']]
        }
        if (pref === 'theme') {
            const v = value as Preferences['theme']
            document.body.classList.remove('dark', 'light')
            if (v !== 'auto') document.body.classList.add(v)
            localStorage.setItem('zanzibar_theme', v)
        }
        if (pref === 'language') {
            currentLanguage.value = value as 'fr' | 'en'
        }
    }

    return { savePreference, loadPreferences, getPreference }
}