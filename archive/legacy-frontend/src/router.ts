// src/router.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router";
import {auth} from "./firebase";

import Home from "./pages/Home.vue";
import AppLayout from "./components/AppLayout.vue"
import Dashboard from "./pages/Dashboard.vue";
import Login from "./pages/Login.vue";
import Ingredients from "./pages/Ingredients.vue";
import Recipes from "./pages/Recipes.vue";
import Products from "./pages/Products.vue";
import { useAuthStore } from './stores/authStore';

const routes = [
  {
    path: '/login',
    component: Login
  },
  {
    path: '/',
    component: AppLayout,
    meta: { requiresAuth: true },
    children: [
      { path: 'dash', component: Dashboard },
      { path: 'ingredients', component: Ingredients },
      { path: 'recipes', component: Recipes },
      { path: 'products', component: Products }
    ]
  }
]

export const router = createRouter({
    history: createWebHistory(),
    routes,
});

// Navigation Guard
router.beforeEach((to) => {
    const userLoggedIn = useAuthStore().isLoggedIn; // 

    // If route requires auth and user is not logged in, redirect to login
    if (to.meta.requiresAuth && !userLoggedIn) return '/login';

    // Otherwise allow navigation
    return true;
});