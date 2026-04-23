import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#16181c',
            color: '#f0f1f3',
            border: '1px solid #2a2d35',
            borderRadius: '10px',
            fontFamily: 'DM Sans, sans-serif',
            fontSize: '13px',
          },
          success: { iconTheme: { primary: '#34d97b', secondary: '#16181c' } },
          error:   { iconTheme: { primary: '#f25c5c', secondary: '#16181c' } },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
)
