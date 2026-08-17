<script setup lang="js">
// import HelloWorld from './components/HelloWorld.vue'
import ProductBuilder from './components/ProductBuilder.vue';
import NavBar from './components/NavBar.vue';
import { useAuthStore } from './stores/authStore';

const authStore = useAuthStore();
</script>

<template>
  <router-view v-if="authStore.authReady"/>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
