<script lang="ts">
import HelloWorld from "./components/HelloWorld.vue";
import Login from "./components/Login.vue";
import { useGameStore } from "./stores/game";

export default {
  name: "App",
  components: { HelloWorld, Login },
  computed: {
    store() {
      return useGameStore();
    },
    logged() {
      return this.store.logged;
    },
  },
  methods: {
    onLoginSuccess() {
      this.store.logged = true;
    },
    handleLogout() {
      this.store.logout();
    },
  },
};
</script>

<template>
  <header>
    <h1>Zanzibar Mobile</h1>
    <span v-if="logged" class="user-info">
      {{ store.login }} | Score: {{ store.localPlayer.score }}
    </span>
  </header>

  <main>
    <!-- Non connecté -->
    <div v-if="!logged">
      <HelloWorld msg="Bienvenue, veuillez vous connecter" />
      <Login message="Connexion" @login-success="onLoginSuccess" />
    </div>

    <!-- Connecté -->
    <div v-else>
      <HelloWorld msg="Vous êtes connecté" />
      <nav class="nav-bar">
        <RouterLink to="/">Accueil</RouterLink>
        <RouterLink to="/map">Carte</RouterLink>
        <RouterLink to="/profile">Profil</RouterLink>
        <button @click="handleLogout">Se déconnecter</button>
      </nav>
      <hr />
      <RouterView />
    </div>
  </main>
</template>

<style scoped>
header {
  padding: 1rem;
  border-bottom: 1px solid #ccc;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.nav-bar {
  display: flex;
  gap: 15px;
  align-items: center;
  margin-bottom: 15px;
}

.nav-bar a {
  color: #42b883;
  text-decoration: none;
  font-weight: bold;
}
.nav-bar a.router-link-active {
  text-decoration: underline;
}

button {
  cursor: pointer;
  padding: 8px 15px;
  background: #42b883;
  color: white;
  border: none;
  border-radius: 4px;
}
button:hover {
  background: #33a06f;
}
</style>
