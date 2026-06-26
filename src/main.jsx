import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes.jsx'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {/* Aqui substituímos o <App /> pelo RouterProvider, passando as tuas rotas */}
    <RouterProvider router={router} />
  </StrictMode>,
)