// src/App.jsx - COMPLETELY FIXED
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import LandingPage from './pages/LandingPage'
import RoleSelection from './pages/RoleSelection'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Classrooms from './pages/Classrooms'
import Students from './pages/Students'
import Attendance from './pages/Attendance'
import Analytics from './pages/Analytics'
import StudentDashboard from './pages/StudentDashboard'

function AppContent() {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [userRole, setUserRole] = useState(null)
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  const navigate = useNavigate()
  const location = useLocation()

  // Auth check - only once
  useEffect(() => {
    const token = localStorage.getItem('token')
    const role = localStorage.getItem('role')
    
    setIsAuthenticated(!!token)
    setUserRole(role)
  }, [])

  // Throttled scroll listener
  useEffect(() => {
    let throttleTimer
    
    const handleScroll = () => {
      if (throttleTimer) return
      
      throttleTimer = setTimeout(() => {
        setScrolled(window.scrollY > 10)
        throttleTimer = null
      }, 100)
    }
    
    window.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (throttleTimer) clearTimeout(throttleTimer)
    }
  }, [])

  // Window resize listener
  useEffect(() => {
    let resizeTimer
    
    const handleResize = () => {
      if (resizeTimer) return
      
      resizeTimer = setTimeout(() => {
        setIsMobile(window.innerWidth <= 768)
        resizeTimer = null
      }, 200)
    }
    
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (resizeTimer) clearTimeout(resizeTimer)
    }
  }, [])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  const handleLogout = useCallback(() => {
    console.log('🚪 Logging out...')
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('role')
    setIsAuthenticated(false)
    setUserRole(null)
    setMobileMenuOpen(false)
    
    navigate('/')
    setTimeout(() => window.location.href = '/', 100)
  }, [navigate])

  const ProtectedRoute = useCallback(({ children, allowedRoles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" />
    }
    if (allowedRoles && !allowedRoles.includes(userRole)) {
      return <Navigate to="/login" />
    }
    return children
  }, [isAuthenticated, userRole])

  const Navbar = useCallback(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}')
    const isActive = (path) => location.pathname === path

    return (
      <nav style={{
        background: scrolled 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.97) 0%, rgba(15, 23, 42, 0.97) 100%)'
          : 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '12px 0',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        transition: 'all 0.3s ease',
        boxShadow: scrolled ? '0 8px 32px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="container-fluid px-4">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Link 
              to={userRole === 'teacher' ? '/teacher/dashboard' : '/student/dashboard'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                color: 'white',
                transition: 'all 0.3s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <img 
                src="/logo.png" 
                alt="SnapTick" 
                style={{
                  height: '44px',
                  width: '44px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))',
                  transition: 'all 0.3s ease'
                }}
              />
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2px'
              }}>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'white',
                  letterSpacing: '-0.5px'
                }}>
                  SnapTick
                </span>
                <span style={{
                  fontSize: '10px',
                  color: '#94a3b8',
                  fontWeight: 600,
                  letterSpacing: '1px'
                }}>
                  ATTENDANCE
                </span>
              </div>
            </Link>

            {!isMobile && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {userRole === 'teacher' && (
                  <>
                    <NavLink 
                      to="/teacher/dashboard" 
                      isActive={isActive('/teacher/dashboard')}
                    >
                      📊 Dashboard
                    </NavLink>
                    <NavLink 
                      to="/classrooms" 
                      isActive={isActive('/classrooms')}
                    >
                      🏫 Classes
                    </NavLink>
                    <NavLink 
                      to="/attendance" 
                      isActive={isActive('/attendance')}
                    >
                      ✅ Attendance
                    </NavLink>
                  </>
                )}

                {userRole === 'student' && (
                  <NavLink 
                    to="/student/dashboard" 
                    isActive={isActive('/student/dashboard')}
                  >
                    🏠 Dashboard
                  </NavLink>
                )}

                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginLeft: '24px',
                  paddingLeft: '24px',
                  borderLeft: '1px solid rgba(148, 163, 184, 0.2)'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    background: 'rgba(148, 163, 184, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(148, 163, 184, 0.2)'
                  }}>
                    <span style={{ fontSize: '20px' }}>
                      {userRole === 'teacher' ? '👨‍🏫' : '👨‍🎓'}
                    </span>
                    <div>
                      <p style={{
                        margin: 0,
                        fontSize: '13px',
                        fontWeight: 600,
                        color: 'white'
                      }}>
                        {user.name || 'User'}
                      </p>
                      <p style={{
                        margin: 0,
                        fontSize: '11px',
                        color: '#94a3b8',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        {userRole === 'teacher' ? 'Teacher' : 'Student'}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleLogout}
                    style={{
                      padding: '10px 18px',
                      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '10px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)'
                      e.target.style.boxShadow = '0 6px 18px rgba(239, 68, 68, 0.4)'
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0)'
                      e.target.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.2)'
                    }}
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>
            )}

            {isMobile && (
              <button
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  background: 'rgba(148, 163, 184, 0.1)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '10px',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontSize: '20px'
                }}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? '✕' : '☰'}
              </button>
            )}
          </div>

          {mobileMenuOpen && isMobile && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              marginTop: '16px',
              paddingTop: '16px',
              borderTop: '1px solid rgba(148, 163, 184, 0.2)'
            }}>
              {userRole === 'teacher' && (
                <>
                  <MobileNavLink 
                    to="/teacher/dashboard" 
                    isActive={isActive('/teacher/dashboard')}
                  >
                    📊 Dashboard
                  </MobileNavLink>
                  <MobileNavLink 
                    to="/classrooms" 
                    isActive={isActive('/classrooms')}
                  >
                    🏫 Classes
                  </MobileNavLink>
                  <MobileNavLink 
                    to="/attendance" 
                    isActive={isActive('/attendance')}
                  >
                    ✅ Attendance
                  </MobileNavLink>
                </>
              )}

              {userRole === 'student' && (
                <MobileNavLink 
                  to="/student/dashboard" 
                  isActive={isActive('/student/dashboard')}
                >
                  🏠 Dashboard
                </MobileNavLink>
              )}

              <button
                onClick={handleLogout}
                style={{
                  padding: '12px',
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}
              >
                🚪 Logout
              </button>
            </div>
          )}
        </div>
      </nav>
    )
  }, [scrolled, userRole, location, isMobile, handleLogout, mobileMenuOpen])

  const PublicNavbar = useCallback(() => {
    const isGetStartedPage = location.pathname === '/role-selection'

    return (
      <nav style={{
        background: scrolled 
          ? 'linear-gradient(135deg, rgba(30, 41, 59, 0.97) 0%, rgba(15, 23, 42, 0.97) 100%)'
          : 'linear-gradient(135deg, rgba(30, 41, 59, 0.98) 0%, rgba(15, 23, 42, 0.98) 100%)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid rgba(148, 163, 184, 0.1)',
        padding: '16px 0',
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        boxShadow: scrolled ? '0 8px 32px rgba(0, 0, 0, 0.2)' : '0 4px 16px rgba(0, 0, 0, 0.1)'
      }}>
        <div className="container-fluid px-4">
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <Link 
              to="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                textDecoration: 'none',
                color: 'white'
              }}
            >
              <img 
                src="/logo.png" 
                alt="SnapTick" 
                style={{
                  height: '44px',
                  width: '44px',
                  objectFit: 'contain',
                  filter: 'drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3))'
                }}
              />
              <div>
                <span style={{
                  fontSize: '18px',
                  fontWeight: 800,
                  color: 'white'
                }}>
                  SnapTick
                </span>
              </div>
            </Link>

            {!isGetStartedPage && (
              <Link 
                to="/role-selection" 
                style={{
                  padding: '12px 24px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '12px',
                  fontWeight: 600,
                  fontSize: '14px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(102, 126, 234, 0.4)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)'
                }}
              >
                🚀 Get Started
              </Link>
            )}
          </div>
        </div>
      </nav>
    )
  }, [scrolled, location])

  const NavLink = useCallback(({ to, isActive, children }) => (
    <Link
      to={to}
      style={{
        padding: '10px 16px',
        color: isActive ? '#667eea' : '#cbd5e1',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: isActive ? 600 : 500,
        transition: 'all 0.3s ease',
        background: isActive ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
        borderBottom: isActive ? '2px solid #667eea' : '2px solid transparent',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '#94a3b8'
          e.currentTarget.style.background = 'rgba(148, 163, 184, 0.1)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.color = '#cbd5e1'
          e.currentTarget.style.background = 'transparent'
        }
      }}
    >
      {children}
    </Link>
  ), [])

  const MobileNavLink = useCallback(({ to, isActive, children }) => (
    <Link
      to={to}
      style={{
        padding: '12px 16px',
        color: isActive ? '#667eea' : '#cbd5e1',
        textDecoration: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: 500,
        background: isActive ? 'rgba(102, 126, 234, 0.15)' : 'transparent',
        transition: 'all 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}
      onClick={() => setMobileMenuOpen(false)}
    >
      {children}
    </Link>
  ), [])

  return (
    <>
      {isAuthenticated ? <Navbar /> : <PublicNavbar />}
      
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/role-selection" element={<RoleSelection />} />
        <Route 
          path="/login/:role?" 
          element={
            <Login 
              setAuth={(isAuth, role) => {
                setIsAuthenticated(isAuth)
                if (role) setUserRole(role)
              }} 
            />
          } 
        />
        
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

        <Route 
          path="/student/dashboard" 
          element={
            <ProtectedRoute allowedRoles={['student']}>
              <StudentDashboard />
            </ProtectedRoute>
          } 
        />

        <Route path="/dashboard" element={<Navigate to="/teacher/dashboard" />} />
        
        <Route path="*" element={
          <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#f1f5f9',
            padding: '20px'
          }}>
            <div style={{
              fontSize: '80px',
              marginBottom: '20px',
              color: '#ef4444'
            }}>❌</div>
            <h1 style={{ fontSize: '32px', fontWeight: 700, marginBottom: '16px' }}>404 - Page Not Found</h1>
            <Link to="/" style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              textDecoration: 'none',
              borderRadius: '10px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              🏠 Go back to home
            </Link>
          </div>
        } />
      </Routes>
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  )
}
