<script setup lang="ts">
import { ref } from "vue";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import { useRouter } from "vue-router"; // 👈 import useRouter

const email = ref("");
const password = ref("");
const loginError = ref("");

const router = useRouter(); // 👈 get router instance

async function login() {
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/dash'); // ✅ now router is defined
  } catch (error: any) {
    console.error('Login failed:', error);
    loginError.value = error.message || error.code || 'Login failed';
  }
}

async function register() {
  try {
    await createUserWithEmailAndPassword(auth, email.value, password.value);
    router.push('/dash'); // redirect after register
  } catch (error: any) {
    console.error('Registration failed:', error);
    loginError.value = error.message || error.code || 'Registration failed';
  }
}
</script>

<template>
  <div class="auth-card">
    <h2>Login</h2>
    <input v-model="email" placeholder="Email" />
    <input v-model="password" type="password" placeholder="Password" />
    <button @click="login">Login</button>
    <button @click="register">Register</button>

    <p v-if="loginError" class="text-danger">{{ loginError }}</p>
  </div>
</template>