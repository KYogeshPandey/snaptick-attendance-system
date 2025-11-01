import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import 'bootstrap/dist/css/bootstrap.min.css'  // ✅ Bootstrap CSS import
import './styles/main.scss'

ReactDOM.createRoot(document.getElementById('root')).render(<App />)
