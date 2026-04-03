import axios from 'axios'

// ✅ Create axios instance with CORRECT backend URL
export const api = axios.create({
  baseURL: 'http://localhost:5000/api',  // Backend URL
  timeout: 10000  // 10 second timeout
})

// ✅ Helper function to manage auth token
export function setAuth(token) {
  if (token) {
    localStorage.setItem('token', token)
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`
    console.log('✅ Auth token saved to localStorage')
  } else {
    localStorage.removeItem('token')
    delete api.defaults.headers.common['Authorization']
    console.log('✅ Auth token cleared from localStorage')
  }
}

// ✅ Get token on app initialization
const savedToken = localStorage.getItem('token')
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`
  console.log('✅ Token loaded from localStorage on app start')
}

// ✅ Request interceptor - Auto-attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
      console.log('✅ Token attached to request:', token.substring(0, 20) + '...')
    } else {
      console.warn('⚠️ No token in localStorage - request will be sent without auth')
    }
    
    return config
  },
  (error) => {
    console.error('❌ Request Error (before sending):', error)
    return Promise.reject(error)
  }
)

// ✅ Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response Success:', response.status, response.config.url)
    return response
  },
  (error) => {
    console.error('❌ Response Error:', {
      status: error.response?.status,
      message: error.message,
      url: error.config?.url
    })

    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      console.error('❌ Unauthorized (401) - Token invalid or expired')
      setAuth(null)  // Clear token
      
      // Redirect to login after small delay
      setTimeout(() => {
        window.location.href = '/login'
      }, 500)
    }

    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      console.error('❌ Forbidden (403) - Access denied')
    }

    // Handle 500 Server Error
    if (error.response?.status === 500) {
      console.error('❌ Server Error (500) - Backend error')
    }

    // Handle Network Error
    if (error.message === 'Network Error' || !error.response) {
      console.error('❌ Network Error - Cannot reach backend')
    }

    return Promise.reject(error)
  }
)

export default api
