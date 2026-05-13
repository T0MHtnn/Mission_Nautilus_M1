<script lang="ts">
import MyMap from '../components/MyMap.vue'
import { t, currentLanguage } from '../composables/usePreferences'
export default {
  name: 'MapView',
  components: { MyMap },
  computed: { t: () => t, lang() { return currentLanguage.value } }
}
</script>

<template>
  <div>
    <h2>{{ t('map') }}</h2>
    <MyMap />
  </div>
</template>
