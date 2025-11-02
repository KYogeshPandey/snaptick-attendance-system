import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// src/main.jsx - ADD THIS at top
import '@fortawesome/fontawesome-free/css/all.min.css'

import 'bootstrap/dist/css/bootstrap.min.css'  // ✅ Bootstrap CSS import
import './styles/main.scss'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
