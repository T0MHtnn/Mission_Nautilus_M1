<template>
  <div class="login-form">
    <h2>{{ t('login') }}</h2>

    <label for="login">{{ t('username') }} :&nbsp;</label>
    <input type="text" name="login" id="login" v-model="loginInput" />
    <br />
    <label for="password">{{ t('password') }} :&nbsp;</label>
    <input type="password" name="password" id="password" v-model="password" />
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
  background: var(--color-background-soft);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  margin: 20px auto;
  max-width: 400px;
  text-align: center;
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

.error {
  color: red;
  margin-top: 10px;
}
</style>
