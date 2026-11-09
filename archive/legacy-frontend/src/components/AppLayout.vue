<template>
  <div class="app-layout">
    <NavBar />

    <div class="app-body">
      <Sidebar />

      <main class="app-content">
        <router-view />
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import NavBar from './NavBar.vue'
import Sidebar from './SideBar.vue'

export default defineComponent({
  name: 'AppLayout',
  components: { NavBar, Sidebar }
})
</script>

<style scoped>
.app-body {
  display: flex;
  min-height: calc(100vh - 56px); /* adjust if navbar height differs */
}

.app-content {
  flex: 1;
  padding: 2rem;
  background-color: #f8f9fa;
}
</style>