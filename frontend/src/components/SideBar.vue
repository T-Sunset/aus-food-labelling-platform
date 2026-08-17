<template>
  <aside class="sidebar">
    <ul>
      <li @click="navigate('/dash')">Dashboard</li>
      <li @click="navigate('/ingredients')">Ingredients</li>
      <li @click="navigate('/recipes')">Recipes</li>
      <li @click="navigate('/products')">Products</li>
    </ul>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useRouter } from 'vue-router'

export default defineComponent({
  name: 'Sidebar',
  setup() {
    const router = useRouter()

    const navigate = (path: string) => {
      router.push(path)
    }

    return { navigate }
  }
})
</script>

<style scoped>
.sidebar {
  width: 240px;
  background: #212529;
  color: white;
  padding: 1rem;
}

.sidebar ul {
  list-style: none;
  padding: 0;
}

.sidebar li {
  padding: 0.75rem 0;
  cursor: pointer;
}

.sidebar li:hover {
  opacity: 0.7;
}
</style>