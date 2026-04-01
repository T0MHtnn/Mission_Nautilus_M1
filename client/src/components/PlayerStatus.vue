<script setup lang="ts">
import { useGameStore } from "../stores/game";
const store = useGameStore();
</script>

<template>
  <div class="status-card">
    <h2>Rôle : {{ store.localPlayer.role }}</h2>
    <p>
      Objets traités : <strong>{{ store.localPlayer.score }}</strong>
    </p>
    <p>
      Position : 
      <small>{{ store.localPlayer.position[0].toFixed(4) }}, {{ store.localPlayer.position[1].toFixed(4) }}</small>
    </p>
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