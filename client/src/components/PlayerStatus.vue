<script setup lang="ts">
import { ref } from 'vue'

// Une variable "réactive" : si elle change, le HTML se met à jour tout seul
const score = ref(0)
const role = ref('Rival')

function incrementScore() {
  score.value++
}
</script>

<template>
  <div class="status-card">
    <h2>Rôle : {{ role }}</h2>
    <p>Objets traités : <strong>{{ score }}</strong></p>
    <button @click="incrementScore">Simuler une capture</button>
  </div>
</template>

<style scoped>
.status-card {
  border: 2px solid #42b883;
  padding: 1rem;
  border-radius: 8px;
  background-color: #f9f9f9;
}
</style>