import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'


export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // allowedHosts: [
    //   '.ngrok-free.app'
    // ]},
    // hmr: {
    //   host: '7646-102-215-78-89.ngrok-free.app',
    //   protocol: 'wss', // Uses secure WebSockets over HTTPS
    //   clientPort: 443  // Public port for ngrok HTTPS tunnels
    //
     }
  
})
