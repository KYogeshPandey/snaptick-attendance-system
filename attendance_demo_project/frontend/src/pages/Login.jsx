// src/pages/Login.jsx - SIMPLE & CLEAN (Reference Design)
import { useState } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { api } from '../services/api'

export default function Login({ setAuth }) {
  const { role } = useParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()

  // Role Configuration
  const roleConfig = {
    teacher: {
      title: 'Teacher Login',
      icon: '👨‍🏫',
      gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      color: '#06b6d4'
    },
    student: {
      title: 'Student Login',
      icon: '👨‍🎓',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      color: '#3b82f6'
    },
    admin: {
      title: 'Admin Login',
      icon: '🛡️',
      gradient: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
      color: '#8b5cf6'
    }
  }

  const currentRole = roleConfig[role] || roleConfig.teacher

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post('/auth/login', { email, password })
      
      console.log('✅ Login Response:', data)
      
      if (!data.access_token) {
        throw new Error('No access token received from server')
      }
      
      localStorage.setItem('token', data.access_token)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('role', data.user.role)
      
      console.log('✅ Token saved:', data.access_token.substring(0, 20) + '...')
      console.log('✅ Role saved:', data.user.role)
      
      if (typeof setAuth === 'function') {
        setAuth(true, data.user.role)
      }
      
      if (data.user.role === 'teacher') {
        console.log('🔄 Redirecting to teacher dashboard...')
        navigate('/teacher/dashboard', { replace: true })
      } else if (data.user.role === 'student') {
        console.log('🔄 Redirecting to student dashboard...')
        navigate('/student/dashboard', { replace: true })
      } else {
        navigate('/dashboard', { replace: true })
      }
      
    } catch (err) {
      console.error('❌ Login Error:', err)
      setError(err.response?.data?.message || err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      background: currentRole.gradient,
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      padding: '20px'
    }}>
      {/* Back to Home Button */}
      <Link
        to="/"
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'white',
          textDecoration: 'none',
          fontSize: '16px',
          fontWeight: 600,
          transition: 'all 0.3s ease',
          padding: '10px 16px',
          borderRadius: '8px',
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.25)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'
        }}
      >
        ← Back to Home
      </Link>

      {/* Login Card */}
      <div style={{
        background: 'rgba(255, 255, 255, 0.95)',
        borderRadius: '32px',
        padding: '60px 48px',
        width: '100%',
        maxWidth: '600px',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
        border: '1px solid rgba(255, 255, 255, 0.2)'
      }}>
        {/* Icon Circle */}
        <div style={{
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: currentRole.gradient,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          margin: '0 auto 24px',
          boxShadow: `0 10px 30px rgba(0, 0, 0, 0.1)`
        }}>
          {currentRole.icon}
        </div>

        {/* Title */}
        <h1 style={{
          fontSize: '40px',
          fontWeight: 800,
          color: '#1f2937',
          textAlign: 'center',
          marginBottom: '40px',
          margin: '0 0 40px 0'
        }}>
          {currentRole.title}
        </h1>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#991b1b',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
            fontSize: '14px',
            fontWeight: 500,
            border: '1px solid #fecaca'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Login ID Field */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '12px'
            }}>
              Login ID
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your login ID"
              style={{
                width: '100%',
                padding: '14px 16px',
                fontSize: '16px',
                border: '2px solid #e5e7eb',
                borderRadius: '12px',
                background: '#f9fafb',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box',
                fontFamily: 'inherit'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = currentRole.color
                e.target.style.background = 'white'
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb'
                e.target.style.background = '#f9fafb'
              }}
            />
          </div>

          {/* Password Field */}
          <div style={{ marginBottom: '32px' }}>
            <label style={{
              display: 'block',
              fontSize: '16px',
              fontWeight: 600,
              color: '#374151',
              marginBottom: '12px'
            }}>
              Password
            </label>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              background: '#f9fafb',
              transition: 'all 0.3s ease',
              paddingRight: '12px'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = currentRole.color
              e.currentTarget.style.background = 'white'
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#e5e7eb'
              e.currentTarget.style.background = '#f9fafb'
            }}
            >
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                style={{
                  flex: 1,
                  padding: '14px 16px',
                  fontSize: '16px',
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '20px',
                  cursor: 'pointer',
                  padding: '8px'
                }}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Forgot Password */}
          <div style={{
            textAlign: 'right',
            marginBottom: '32px'
          }}>
            <Link to="#" style={{
              fontSize: '14px',
              fontWeight: 600,
              color: currentRole.color,
              textDecoration: 'none',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.7'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1'
            }}
            >
              Forgot Password?
            </Link>
          </div>

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '16px',
              fontSize: '18px',
              fontWeight: 700,
              color: 'white',
              background: currentRole.gradient,
              border: 'none',
              borderRadius: '12px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.8 : 1,
              transition: 'all 0.3s ease',
              boxShadow: '0 8px 20px rgba(0, 0, 0, 0.15)'
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.boxShadow = '0 12px 30px rgba(0, 0, 0, 0.25)'
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.15)'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>

      <style>{`
        * {
          box-sizing: border-box;
        }

        input::placeholder {
          color: #9ca3af;
        }

        @media (max-width: 600px) {
          div {
            padding: 40px 24px !important;
          }

          h1 {
            font-size: 32px !important;
          }
        }
      `}</style>
    </div>
  )
}
