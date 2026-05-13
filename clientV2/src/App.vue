<script lang="ts">
import HelloWorld from "./components/HelloWorld.vue";
import Login from "./components/Login.vue";
import { useGameStore } from "./stores/game";
import { useTheme } from './composables/useTheme'
import { usePreferences, t, currentLanguage } from './composables/usePreferences'

export default {
  name: "App",
  components: { HelloWorld, Login },
  mounted() {
    const store = useGameStore()
    const { loadPreferences } = usePreferences(store.login || 'default')
    loadPreferences()
    const { startLightSensor } = useTheme()
    startLightSensor()
  },
  computed: {
    store() {
      return useGameStore();
    },
    logged() {
      return this.store.logged;
    },
    t: () => t,
    lang() { return currentLanguage.value }
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
      <HelloWorld msg="t('welcome')" />
      <Login message="Connexion" @login-success="onLoginSuccess" />
    </div>

    <!-- Connecté -->
    <div v-else>
      <HelloWorld :msg="t('welcomeConnected')" />
      <nav class="nav-bar">
        <RouterLink to="/">{{ t('homeLink') }}</RouterLink>
        <RouterLink to="/map">{{ t('mapLink') }}</RouterLink>
        <RouterLink to="/profile">{{ t('profile') }}</RouterLink>
        <button @click="handleLogout">{{ t('logout') }}</button>
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
