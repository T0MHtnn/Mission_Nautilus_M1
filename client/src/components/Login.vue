<template>
  <div class="login-form">
    <h2>{{ message }}</h2>

    <label for="login">Login :&nbsp;</label>
    <input type="text" name="login" id="login" v-model="username" />
    <br />
    <label for="password">Password :&nbsp;</label>
    <input type="password" name="password" id="password" v-model="password" />
    <br />
    <button @click="login">Send</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script lang="ts">
export default {
  name: 'MyLogin',
  props: {
    message: String,
  },
  emits: ['login-success'],
  data() {
    return {
      username: '',
      password: '',
      error: '',
    }
  },
  methods: {
    async login() {
      this.error = ''
      try {
        const response = await fetch('http://localhost:3000/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            login: this.username,
            password: this.password,
          }),
        })

        if (!response.ok) {
          this.error = 'Identifiants incorrects'
          return
        }

        const data = await response.json()

        if (data.token) {
          // Stocker le token pour les futures requêtes
          localStorage.setItem('zanzibar_token', data.token)
          // Notifier le parent que le login a réussi
          this.$emit('login-success')
        } else {
          this.error = 'Aucun token reçu'
        }
      } catch (e) {
        console.error('Erreur de connexion', e)
        this.error = 'Erreur réseau, vérifiez que le serveur est lancé'
      }
    },
  },
}
</script>

<style scoped>
.login-form {
  padding: 2rem;
  background: #f0f0f0;
  border-radius: 8px;
  margin: 20px auto;
  max-width: 400px;
  text-align: center;
}

input,
input[type='submit'],
select {
  color: grey;
  border: 1px solid;
  padding: 6px;
  margin: 4px 0;
  border-radius: 4px;
}

.error {
  color: red;
  margin-top: 10px;
}
</style>
