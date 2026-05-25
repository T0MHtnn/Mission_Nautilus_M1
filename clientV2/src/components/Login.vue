<template>
  <div class="login-form">
    <h2>{{ t('login') }}</h2>

    <label for="login">{{ t('username') }} :&nbsp;</label>
    <input type="text" placeholder="Login" name="login" id="login" v-model="loginInput" />
    <br />
    <label for="password">{{ t('password') }} :&nbsp;</label>
    <input type="password" placeholder="Mot de passe" name="password" id="password" v-model="password" />
    <br />
    <button @click="login">{{ t('loginButton') }}</button>
    <p v-if="error" class="error">{{ error }}</p>
  </div>
</template>

<script lang="ts">
import { useGameStore } from "../stores/game";
import { t, currentLanguage } from '../composables/usePreferences'

export default {
  name: "MyLogin",
  props: {
    message: String,
  },
  emits: ["login-success"],
  data() {
    return {
      loginInput: "",
      password: "",
      error: "",
    };
  },
  computed: {
    t: () => t,
    lang() { return currentLanguage.value }
  },
  methods: {
    async login() {
      this.error = "";
      const store = useGameStore();

      const result = await store.doLogin(this.loginInput, this.password);
      if (result.success) {
        this.$emit("login-success");
      } else {
        this.error = result.error || "Échec de connexion";
      }
    },
  },
};
</script>

<style scoped>
.login-form {
  padding: 2rem;
  background: rgba(60, 71, 63, 0.85);
  border: 1px solid rgba(83, 92, 74, 0.5);
  border-radius: 20px;
  margin: 20px auto;
  max-width: 400px;
  text-align: center;
}

h2 {
  color: #dfcba2;
  font-family: _h2_;
  font-size: 1.8em;
  margin-bottom: 1rem;
}

.field {
  margin-bottom: 12px;
  text-align: left;
}

.field label {
  display: block;
  margin-bottom: 4px;
  color: #dfcba2;
  font-weight: bold;
}

.field input {
  width: 100%;
  padding: 8px;
  background: #dfcba2;
  border: 1px solid #535C4A;
  border-radius: 5px;
  color: darkslategrey;
  box-sizing: border-box;
}

button {
  width: 100%;
  padding: 10px;
  margin-top: 10px;
  background: #535C4A;
  color: #dfcba2;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1rem;
  transition: background 0.2s;
}

button:hover {
  background: #3C473F;
}

.error {
  color: #ff6b6b;
  margin-top: 10px;
}

input,
input[type="submit"],
select {
  color: grey;
  border: 1px solid;
  padding: 6px;
  margin: 4px 0;
  border-radius: 4px;
}

</style>
