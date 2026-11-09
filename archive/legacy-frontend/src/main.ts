import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { router } from "./router";
import {createPinia} from 'pinia';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { useAuthStore } from './stores/authStore';

const app = createApp(App)

const pinia = createPinia();
app.use(pinia);
app.use(router);

const authStore = useAuthStore();
authStore.initAuth();

app.mount('#app')
