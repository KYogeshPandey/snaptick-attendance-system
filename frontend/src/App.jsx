// App.jsx - COMPLETE UPDATED VERSION WITH ROLE-BASED ROUTING
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Classrooms from './pages/Classrooms'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Analytics from './pages/Analytics'
import StudentDashboard from './pages/StudentDashboard'

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)

  // Initialize auth state on component mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    const user = localStorage.getItem('user')
    
    setIsAuthenticated(!!token)
    setUserRole(role)
    
    console.log('🔐 Auth initialized:', { 
      isAuthenticated: !!token, 
      role: role,
      user: user ? JSON.parse(user).name : 'None'
    })
  }, [])

  // Logout handler
  const handleLogout = () => {
    console.log('🚪 Logging out...')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    setIsAuthenticated(false)
    setUserRole(null)
  }

  // Protected Route Component with role-based access control
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated) {
      console.log('❌ Not authenticated, redirecting to login')
      return <Navigate to="/login" />
    }
    
    // Role-based access control
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      console.log(`❌ Access denied. Required: ${allowedRoles}, Current: ${userRole}`)
      return <Navigate to="/login" />
    }
    
    console.log(`✅ Access granted. Role: ${userRole}`)
    return children
  }

  // Navbar Component with role-based navigation
  const Navbar = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    
    return (
      <nav style={{
        background: '#1f2937',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        color: '#fff',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>
            📚 SnapTick
          </h2>
          
          {/* Teacher Navigation */}
          {userRole === 'teacher' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <Link 
                to="/teacher/dashboard" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14,
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                🏠 Dashboard
              </Link>
              <Link 
                to="/classrooms" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                🏫 Classrooms
              </Link>
              <Link 
                to="/students" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                👨‍🎓 Students
              </Link>
              <Link 
                to="/attendance" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                ✅ Attendance
              </Link>
              <Link 
                to="/analytics" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                📊 Analytics
              </Link>
            </div>
          )}

          {/* Student Navigation */}
          {userRole === 'student' && (
            <div style={{ display: 'flex', gap: 12 }}>
              <Link 
                to="/student/dashboard" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                🏠 Dashboard
              </Link>
              <Link 
                to="/student/attendance" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                📋 My Attendance
              </Link>
              <Link 
                to="/student/profile" 
                style={{ 
                  color: '#fff', 
                  textDecoration: 'none', 
                  padding: '8px 16px', 
                  borderRadius: 4, 
                  background: '#374151',
                  fontSize: 14 
                }}
                onMouseOver={(e) => e.target.style.background = '#4b5563'}
                onMouseOut={(e) => e.target.style.background = '#374151'}
              >
                👤 Profile
              </Link>
            </div>
          )}
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: 14, color: '#9ca3af' }}>
            <strong style={{ color: '#fff' }}>{user.name || 'User'}</strong>
            {' | '}
            <span style={{ 
              padding: '4px 8px', 
              background: userRole === 'teacher' ? '#3b82f6' : '#10b981',
              borderRadius: 4,
              fontSize: 12,
              fontWeight: 500
            }}>
              {userRole === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
            </span>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '8px 16px',
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.target.style.background = '#dc2626'}
            onMouseOut={(e) => e.target.style.background = '#ef4444'}
          >
            Logout
          </button>
        </div>
      </nav>
    )
  }

  return (
    <BrowserRouter>
      {isAuthenticated && <Navbar />}
      
      <Routes>
        {/* ==================== PUBLIC ROUTES ==================== */}
        <Route 
          path="/login" 
          element={
            <Login 
              setAuth={(isAuth, role) => {
                console.log('🔐 setAuth called from Login:', { isAuth, role })
                setIsAuthenticated(isAuth)
                if (role) {
                  setUserRole(role)
                  console.log('✅ User role updated to:', role)
                }
              }} 
            />
          } 
        />
        <Route path="/signup" element={<Signup />} />
        
        {/* ==================== TEACHER ROUTES ==================== */}
        <Route 
          path="/teacher/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/classrooms" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Classrooms />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/students" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Students />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/attendance" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Attendance />
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <Analytics />
            </ProtectedRoute>
          } 
        />

                {/* ==================== STUDENT ROUTES ==================== */}
        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/student/attendance" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <h2>📋 My Attendance</h2>
                <p style={{ color: '#6b7280', marginTop: 16 }}>Coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/profile" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <div style={{ padding: 24, textAlign: 'center' }}>
                <h2>👤 My Profile</h2>
                <p style={{ color: '#6b7280', marginTop: 16 }}>Coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />

        {/* ==================== REDIRECTS ==================== */}
        <Route path="/dashboard" element={<Navigate to="/teacher/dashboard" />} />
        <Route path="/" element={
          isAuthenticated 
            ? (userRole === 'teacher' ? <Navigate to="/teacher/dashboard" /> : <Navigate to="/student/dashboard" />)
            : <Navigate to="/login" />
        } />
        
        {/* ==================== 404 FALLBACK ==================== */}
        <Route path="*" element={
          <div style={{ padding: 24, textAlign: 'center' }}>
            <h1>404 - Page Not Found</h1>
            <Link to="/" style={{ color: '#3b82f6' }}>Go back to home</Link>
          </div>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
