import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { QuillEditor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.snow.css'

import App from './App.vue'
import router from './router'
import { useAppStore } from './stores/app'

import './assets/style.css'

const app = createApp(App)

app.use(createPinia())

// Load data before router setup
const store = useAppStore()
store.loadData()

app.use(router)

// Register Quill globally
app.component('QuillEditor', QuillEditor)

app.mount('#app')
