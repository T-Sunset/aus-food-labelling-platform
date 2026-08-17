import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { auth } from '../firebase'; // your firebase import
import { onAuthStateChanged, type User } from 'firebase/auth';

export const useAuthStore = defineStore('auth', () => {
  // Firebase user object
  const user = ref<User | null>(null);

  // Reactive auth state
  const isLoggedIn = computed(() => !!user.value);
  const displayName = computed(() => user.value?.displayName || 'User');
  const email = computed(() => user.value?.email || '');
  const authReady = ref(false);

  // Initialize Firebase auth listener
  const initAuth = () => {
    onAuthStateChanged(auth, (firebaseUser) => {
      user.value = firebaseUser;
      authReady.value = true;
    });
  };

  // Optional: Logout function
  const logout = async () => {
    await auth.signOut();
  };

  return { user, isLoggedIn, displayName, email, authReady, initAuth, logout };
});