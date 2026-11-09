<script lang="ts">
import { defineComponent, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore';

export default defineComponent({
  name: 'NavBar',
  setup() {
    const router = useRouter();
    const route = useRoute();
    const authStore = useAuthStore();

    const navigate = (path: string) => router.push(path);
    const isActive = (path: string) => route.path === path;

    return {
      authStore, // 👈 expose whole store
      navigate,
      isActive,
    };
  },
});
</script>

<template>
  <nav class="navbar navbar-expand-lg sticky-top bg-brand-blue">
    <div class="container">
      <a class="navbar-brand d-flex align-items-center" href="#" @click.prevent="navigate('/')">
        <img src="../assets/STRIX.png" alt="Strix Logo" width="40" height="40" class="me-2">
        FOOD LABELLER
      </a>

      <button
        class="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarNav"
        aria-controls="navbarNav"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span class="navbar-toggler-icon"></span>
      </button>

      <div class="collapse navbar-collapse" id="navbarNav">
        <ul class="navbar-nav ms-auto align-items-center">
          <!-- User Dropdown -->
            <li v-if="authStore.isLoggedIn" class="nav-item dropdown ms-3">
            <a
                class="nav-link dropdown-toggle"
                href="#"
                role="button"
                data-bs-toggle="dropdown"
            >
                Welcome, {{ authStore.displayName }}
            </a>
            <ul class="dropdown-menu dropdown-menu-end">
                <li>
                <a class="dropdown-item" @click.prevent="navigate('/dash')">
                    Dashboard
                </a>
                </li>
                <li><hr class="dropdown-divider" /></li>
                <li>
                <a class="dropdown-item text-danger" @click.prevent="authStore.logout()">
                    Logout
                </a>
                </li>
            </ul>
            </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>
/* Branding */
.bg-brand-blue {
  background-color: #1a73e8 !important;
}

.navbar-brand {
  font-weight: bold;
  color: #ffffff !important;
}

.navbar-brand img {
  object-fit: contain;
  border-radius: 4px;
}

.nav-link {
  color: #ffffff !important;
  margin-left: 1rem;
  transition: color 0.2s;
}

.nav-link:hover {
  color: #ffd700 !important; /* gold hover */
}

.nav-link.active {
  border-bottom: 2px solid #ffd700;
}

/* Dropdown */
.dropdown-menu {
  min-width: 10rem;
}
.dropdown-item:hover {
  background-color: #f0f0f0;
  color: #1a73e8 !important;
}

/* Toggler border color */
.navbar-toggler {
  border-color: rgba(255, 255, 255, 0.5);
}
</style>