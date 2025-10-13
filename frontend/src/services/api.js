import axios from 'axios'

// Create axios instance with CORRECT backend URL
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',  // ← FIXED: Backend URL
})

// Helper function to manage auth token
export function setAuth(token) {
  if (token) {
    localStorage.setItem('token', token)
  } else {
    localStorage.removeItem('token')
  }
}

// Request interceptor - Auto-attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Token attached to request:', token.substring(0, 30) + '...')
    } else {
      console.warn('⚠️ No token found in localStorage')
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor - Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('❌ Unauthorized - Token invalid or expired')
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
