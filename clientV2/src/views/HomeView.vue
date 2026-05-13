<script lang="ts">
import { t, currentLanguage } from '../composables/usePreferences'
export default {
  name: 'HomeView',
  computed: { t: () => t, lang() { return currentLanguage.value } }
}
</script>

<template>
  <div class="home">
    <h1>{{ t('welcome') }}</h1>
    <p>{{ t('connectPrompt') }}</p>
  </div>
</template>
