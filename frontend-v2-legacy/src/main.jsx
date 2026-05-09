
console.log('VITE_CROWDFUNDING_CONTRACT_ADDRESS (main.jsx):', import.meta.env.VITE_CROWDFUNDING_CONTRACT_ADDRESS);
console.log('VITE_NETWORK (main.jsx):', import.meta.env.VITE_NETWORK);
console.log('VITE_STACKS_API_URL (main.jsx):', import.meta.env.VITE_STACKS_API_URL);
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/app.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
