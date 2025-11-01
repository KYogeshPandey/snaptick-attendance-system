// hooks/useAuth.js - COMPLETE UPDATED VERSION
import { create } from 'zustand'
import { api, setAuth } from '../services/api'

export const useAuth = create((set) => ({
  user: JSON.parse(localStorage.getItem('user')) || null,
  role: localStorage.getItem('role') || null,
  token: localStorage.getItem('token') || null,
  loading: false,
  error: null,

  // Initialize auth state from localStorage
  init: async () => {
    const token = localStorage.getItem('token')
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    const role = localStorage.getItem('role')
    
    if (token && user) {
      setAuth(token)
      set({ user, role, token })
    }
  },

  // Login function - UPDATED with role handling
  login: async (email, password) => {
    set({ loading: true, error: null })
    
    try {
      // Call backend login API
      const { data } = await api.post('/auth/login', { email, password })
      
      // Save token
      localStorage.setItem('token', data.access_token)
      
      // Save user data
      localStorage.setItem('user', JSON.stringify(data.user))
      
      // Save role separately for quick access
      localStorage.setItem('role', data.user.role)
      
      // Set auth token in axios
      setAuth(data.access_token)
      
      // Update state
      set({ 
        user: data.user, 
        role: data.user.role, 
        token: data.access_token, 
        loading: false,
        error: null
      })
      
      // Return role for routing
      return data.user.role
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Login failed'
      set({ error: errorMsg, loading: false })
      throw error
    }
  },

  // Register/Signup function - UPDATED
  register: async (payload) => {
    set({ loading: true, error: null })
    
    try {
      // Call backend signup API
      const { data } = await api.post('/auth/signup', payload)
      set({ loading: false, error: null })
      return data
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Signup failed'
      set({ error: errorMsg, loading: false })
      throw error
    }
  },

  // Logout function - Clear everything
  logout: () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    setAuth(null)
    set({ user: null, role: null, token: null, error: null })
  },
}))
