<script lang="ts">
import { useGameStore } from "../stores/game";
import { useTheme } from '../composables/useTheme'

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
    };
  },
  computed: {
    store() {
      return useGameStore();
    },
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
      const { applyTheme } = useTheme()
      applyTheme(this.selectedTheme as 'light' | 'dark' | 'auto')
    },
  },
};
</script>

<template>
  <main>
    <h1>Mon profil</h1>

    <div class="profile-form">
      <div class="field">
        <label for="login">Utilisateur</label>
        <input type="text" id="login" :value="store.login" disabled />
      </div>

      <div class="field">
        <label for="imageUrl">URL de l'image de profil</label>
        <input
          type="url"
          id="imageUrl"
          v-model="imageUrl"
          placeholder="https://..."
        />
      </div>

      <div class="field">
        <label for="newPassword">Nouveau mot de passe</label>
        <input
          type="password"
          id="newPassword"
          v-model="newPassword"
          placeholder="Laisser vide pour ne pas changer"
        />
      </div>

      <div class="field">
        <label for="confirmPassword">Confirmer le mot de passe</label>
        <input type="password" id="confirmPassword" v-model="confirmPassword" />
      </div>

      <button @click="saveProfile">Enregistrer</button>

      <p v-if="message" class="success">{{ message }}</p>
      <p v-if="error" class="error">{{ error }}</p>

      <div class="field">
        <label for="theme">Thème</label>
        <select id="theme" v-model="selectedTheme" @change="handleThemeChange">
          <option value="auto">Automatique (luminosité)</option>
          <option value="light">Clair</option>
          <option value="dark">Sombre</option>
        </select>
      </div>
    </div>

    <div class="stats">
      <h2>Statistiques</h2>
      <p>
        Role : <strong>{{ store.localPlayer.role }}</strong>
      </p>
      <p>
        Score : <strong>{{ store.localPlayer.score }}</strong>
      </p>
      <p>
        Position :
        <strong
          >{{ store.localPlayer.position[0].toFixed(5) }},
          {{ store.localPlayer.position[1].toFixed(5) }}</strong
        >
      </p>
    </div>
  </main>
</template>

<style scoped>
.profile-form {
  max-width: 450px;
  margin: 20px 0;
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

button {
  padding: 10px 20px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}
button:hover {
  background: #33a06f;
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
  margin-top: 30px;
  padding: 15px;
  background: var(--color-background-soft);
  border-radius: 8px;
  max-width: 450px;
}

select {
  width: 100%;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
  box-sizing: border-box;
}
</style>
