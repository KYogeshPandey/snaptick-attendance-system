// pages/Login.jsx - COMPLETE FIXED VERSION
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { api } from '../services/api'

export default function Login({ setAuth }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password })
      
      console.log('✅ Login successful:', data)
      
      // Save to localStorage
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('role', data.user.role)
      
      console.log('✅ Saved role:', data.user.role)
      
      // Update auth state WITH role
      if (typeof setAuth === 'function') {
        setAuth(true, data.user.role)  // ✅ Pass role as second parameter
      }
      
      // Small delay to ensure state updates
      setTimeout(() => {
        if (data.user.role === 'teacher') {
          console.log('🔄 Redirecting to teacher dashboard...')
          navigate('/teacher/dashboard')
        } else if (data.user.role === 'student') {
          console.log('🔄 Redirecting to student dashboard...')
          navigate('/student/dashboard')
        } else {
          navigate('/dashboard')
        }
      }, 100)
      
    } catch (err) {
      console.error('❌ Login failed:', err)
      setError(err.response?.data?.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: '#f3f4f6'
    }}>
      <div style={{
        background: '#fff',
        padding: 40,
        borderRadius: 8,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: 400
      }}>
        <h2 style={{ textAlign: 'center', marginBottom: 24 }}>📚 SnapTick Login</h2>
        
        {error && (
          <div style={{
            padding: 12,
            background: '#fee2e2',
            color: '#991b1b',
            borderRadius: 6,
            marginBottom: 16,
            fontSize: 14
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Email:
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="nidhi@college.edu"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label style={{ display: 'block', marginBottom: 8, fontWeight: 500 }}>
              Password:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="teacher123"
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #d1d5db',
                borderRadius: 6,
                fontSize: 14
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: 12,
              background: loading ? '#9ca3af' : '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 16,
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p style={{ textAlign: 'center', marginTop: 16, color: '#6b7280', fontSize: 14 }}>
          Don&apos;t have an account?{' '}
          <Link to="/signup" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: 500 }}>
            Sign up
          </Link>
        </p>
        
        <div style={{ marginTop: 16, padding: 12, background: '#f3f4f6', borderRadius: 6, fontSize: 12 }}>
          <strong>Test Accounts:</strong><br/>
          Teacher: nidhi@college.edu / teacher123
        </div>
      </div>
    </div>
  )
}
