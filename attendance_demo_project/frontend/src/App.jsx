// App.jsx - IMPROVED VERSION
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom'
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

  // Navbar Component with Bootstrap
  const Navbar = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const location = useLocation()
    
    const isActive = (path) => location.pathname === path

    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
        <div className="container-fluid px-4">
          {/* Brand */}
          <Link 
            className="navbar-brand fw-bold fs-4 brand-hover" 
            to={userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
          >
            📚 SnapTick
          </Link>

          {/* Toggler for mobile */}
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarContent"
            aria-controls="navbarContent"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation Links */}
          <div className="collapse navbar-collapse" id="navbarContent">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {userRole === 'teacher' && (
                <>
                  <li className="nav-item">
                    <Link 
                      to="/teacher/dashboard" 
                      className={`nav-link nav-link-hover px-3 ${isActive('/teacher/dashboard') ? 'active' : ''}`}
                    >
                      🏠 Dashboard
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link 
                      to="/classrooms" 
                      className={`nav-link nav-link-hover px-3 ${isActive('/classrooms') ? 'active' : ''}`}
                    >
                      🏫 Classrooms
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link 
                      to="/attendance" 
                      className={`nav-link nav-link-hover px-3 ${isActive('/attendance') ? 'active' : ''}`}
                    >
                      ✅ Attendance
                    </Link>
                  </li>
                </>
              )}

              {userRole === 'student' && (
                <>
                  <li className="nav-item">
                    <Link 
                      to="/student/dashboard" 
                      className={`nav-link nav-link-hover px-3 ${isActive('/student/dashboard') ? 'active' : ''}`}
                    >
                      🏠 Dashboard
                    </Link>
                  </li>
                </>
              )}
            </ul>

            {/* User Info & Logout */}
            <div className="d-flex align-items-center gap-3">
              {/* User Badge */}
              <div className="d-none d-md-flex align-items-center gap-2">
                <span className="text-light fw-semibold">{user.name || 'User'}</span>
                <span className={`badge ${userRole === 'teacher' ? 'bg-primary' : 'bg-success'} px-3 py-2 fs-7`}>
                  {userRole === 'teacher' ? '👨‍🏫 Teacher' : '👨‍🎓 Student'}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="btn btn-danger btn-hover px-3 py-2"
              >
                🚪 Logout
              </button>
            </div>
          </div>
        </div>
      </nav>
    )
  }

  // Public Navbar for non-authenticated users
  const PublicNavbar = () => {
    return (
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm sticky-top">
        <div className="container-fluid px-4">
          {/* Brand */}
          <Link className="navbar-brand fw-bold fs-4 brand-hover" to="/">
            📚 SnapTick
          </Link>

          {/* Get Started Button */}
          <Link to="/login" className="btn btn-primary btn-hover px-4 py-2">
            🚀 Get Started
          </Link>
        </div>
      </nav>
    )
  }

  return (
    <BrowserRouter>
      {isAuthenticated ? <Navbar /> : <PublicNavbar />}
      
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
              <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
                <div style={{ fontSize: 80 }}>📋</div>
                <h2 className="mt-3 fw-bold">My Attendance</h2>
                <p className="text-muted">Coming soon...</p>
              </div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/student/profile" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
                <div style={{ fontSize: 80 }}>👤</div>
                <h2 className="mt-3 fw-bold">My Profile</h2>
                <p className="text-muted">Coming soon...</p>
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
          <div className="min-vh-100 d-flex flex-column align-items-center justify-content-center bg-light">
            <div style={{ fontSize: 80 }}>❌</div>
            <h1 className="mt-3 fw-bold">404 - Page Not Found</h1>
            <Link to="/" className="btn btn-primary btn-lg mt-3 btn-hover">🏠 Go back to home</Link>
          </div>
        } />
      </Routes>

      {/* Custom Styles */}
      <style>{`
        /* Navbar hover effects */
        .nav-link-hover {
          transition: all 0.3s ease;
          position: relative;
        }
        
        .nav-link-hover:hover {
          background-color: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          transform: translateY(-2px);
        }
        
        .nav-link.active {
          background-color: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          font-weight: 600;
        }
        
        /* Button hover */
        .btn-hover {
          transition: all 0.3s ease;
        }
        
        .btn-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        }
        
        /* Brand hover */
        .brand-hover {
          transition: all 0.3s ease;
        }
        
        .brand-hover:hover {
          transform: scale(1.05);
          color: #60a5fa !important;
        }
        
        /* Navbar shadow on scroll */
        .sticky-top {
          box-shadow: 0 2px 10px rgba(0,0,0,0.15);
        }
        
        /* Mobile menu smooth transition */
        .navbar-collapse {
          transition: all 0.3s ease-in-out;
        }
      `}</style>
    </BrowserRouter>
  )
}

export default App
