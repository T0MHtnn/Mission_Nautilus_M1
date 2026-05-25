<script lang="ts">
import { useGameStore } from "../stores/game";
import { useTheme } from '../composables/useTheme'
import { usePreferences } from '../composables/usePreferences'
import { t, currentLanguage } from '../composables/usePreferences'

export default {
  name: "ProfileView",
  data() {
    return {
      newPassword: "",
      confirmPassword: "",
      imageUrl: "",
      message: "",
      error: "",
      selectedTheme: localStorage.getItem('zanzibar_theme') || 'auto',
      selectedFontSize: 'normal',
      selectedLanguage: 'fr',
    };
  },
  mounted() {
    const { getPreference } = usePreferences(this.store.login)
    this.selectedTheme = getPreference('theme')
    this.selectedFontSize = getPreference('fontSize')
    this.selectedLanguage = getPreference('language')
  },
  computed: {
    store() {
      return useGameStore();
    },
    t: () => t,
    lang() { return currentLanguage.value }
  },
  methods: {
    async saveProfile() {
      this.message = "";
      this.error = "";

      if (this.newPassword && this.newPassword !== this.confirmPassword) {
        this.error = "Les mots de passe ne correspondent pas";
        return;
      }

      const success = await this.store.updateProfile(
        this.newPassword || undefined,
        this.imageUrl || undefined,
      );

      if (success) {
        this.message = "Profil mis à jour avec succès";
        this.newPassword = "";
        this.confirmPassword = "";
      } else {
        this.error = "Erreur lors de la mise à jour du profil";
      }
    },
    
    handleThemeChange() {
      const { savePreference } = usePreferences(this.store.login)
      savePreference('theme', this.selectedTheme as 'auto' | 'light' | 'dark')
    },
    handleFontSizeChange() {
      const { savePreference } = usePreferences(this.store.login)
      savePreference('fontSize', this.selectedFontSize as 'small' | 'normal' | 'large')
    },
    handleLanguageChange() {
      const { savePreference } = usePreferences(this.store.login)
      savePreference('language', this.selectedLanguage as 'fr' | 'en')
    },
  },
};
</script>

<template>
  <main>
    <h1>{{ t('profileTitle') }}</h1>

    <div class="profile-container">
      <div class="stats">
        <h2>{{ t('stats') }}</h2>
        <p>{{ t('role') }} : <strong>{{ store.localPlayer.role }}</strong></p>
        <p>{{ t('score') }} : <strong>{{ store.localPlayer.score }}</strong></p>
        <p>{{ t('position') }} : <strong>{{ store.localPlayer.position[0].toFixed(5) }}, {{ store.localPlayer.position[1].toFixed(5) }}</strong></p>
      </div>

      <div class="profile-form">
        <div class="field">
          <label for="login">{{ t('profileUser') }}</label>
          <input type="text" id="login" :value="store.login" disabled />
        </div>
        <div class="field">
          <label for="imageUrl">{{ t('profileImageUrl') }}</label>
          <input type="url" id="imageUrl" v-model="imageUrl" placeholder="https://..." />
        </div>
        <div class="field">
          <label for="newPassword">{{ t('profileNewPassword') }}</label>
          <input type="password" id="newPassword" v-model="newPassword" :placeholder="t('profilePasswordPlaceholder')" />
        </div>
        <div class="field">
          <label for="confirmPassword">{{ t('profileConfirmPassword') }}</label>
          <input type="password" id="confirmPassword" v-model="confirmPassword" />
        </div>
        <button @click="saveProfile">{{ t('profileSave') }}</button>
        <p v-if="message" class="success">{{ message }}</p>
        <p v-if="error" class="error">{{ error }}</p>
        <div class="field">
          <label for="theme">{{ t('themeLabel') }}</label>
          <select id="theme" v-model="selectedTheme" @change="handleThemeChange">
            <option value="auto">{{ t('themeAuto') }}</option>
            <option value="light">{{ t('themeLight') }}</option>
            <option value="dark">{{ t('themeDark') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="fontSize">{{ t('fontSizeLabel') }}</label>
          <select id="fontSize" v-model="selectedFontSize" @change="handleFontSizeChange">
            <option value="small">{{ t('fontSmall') }}</option>
            <option value="normal">{{ t('fontNormal') }}</option>
            <option value="large">{{ t('fontLarge') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="language">{{ t('languageLabel') }}</label>
          <select id="language" v-model="selectedLanguage" @change="handleLanguageChange">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.profile-form {
  flex: 1;
  max-width: 450px;
  margin-right: auto;
}

.field {
  margin-bottom: 12px;
}

.field label {
  display: block;
  margin-bottom: 4px;
  font-weight: bold;
}

.field input {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

input:disabled {
  font-weight: bold;
  color: #3C473F;
}

button {
  padding: 10px 20px;
  background: #3C473F;
  color: #dfcba2;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #535C4A;
}

.success {
  color: green;
  margin-top: 10px;
}
.error {
  color: red;
  margin-top: 10px;
}

.stats {
  padding: 15px;
  background: var(--color-background-soft);
  border-radius: 8px;
  flex: 0 0 400px;
}

.stats h2 {
  color: #FFF;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}

.profile-container {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  margin-top: 20px;
  width: 100%;
}

</style>
