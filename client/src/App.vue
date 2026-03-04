<script lang="ts">
import HelloWorld from './components/HelloWorld.vue'
import Login from './components/Login.vue'

export default {
  name: 'App',
  components: { HelloWorld, Login },
  data() {
    return {
      logged: false,
    }
  },
  methods: {
    onLoginSuccess() {
      this.logged = true
    },
    handleLogout() {
      this.logged = false
      localStorage.removeItem('zanzibar_token')
    },
  },
}
</script>

<template>
  <header>
    <h1>Zanzibar Mobile</h1>
    <button @click="logged = !logged">Toggle login</button>
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