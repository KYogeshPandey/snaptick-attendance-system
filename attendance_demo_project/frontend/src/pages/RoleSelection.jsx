// src/pages/RoleSelection.jsx - CLEAN & SIMPLE
import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function RoleSelection() {
  const navigate = useNavigate()
  const [hoveredRole, setHoveredRole] = useState(null)

  const handleRoleSelect = (role) => {
    navigate(`/login/${role}`)
  }

  const roles = [
    {
      role: 'admin',
      title: "You're Admin",
      subtitle: 'Manage the entire system',
      iconUnicode: '🛡️',
      bgGradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
      accentColor: '#3b82f6'
    },
    {
      role: 'teacher',
      title: "You're Teacher",
      subtitle: 'Track and manage attendance',
      iconUnicode: '📖',
      bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
      accentColor: '#06b6d4'
    },
    {
      role: 'student',
      title: "You're Student",
      subtitle: 'View your attendance records',
      iconUnicode: '👥',
      bgGradient: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)',
      accentColor: '#00a8d8'
    }
  ]

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f67b1 0%, #00a8e8 50%, #0f67b1 100%)',
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      padding: '40px 20px'
    }}>
      {/* Static Background Blobs - No Animation */}
      <div style={{
        position: 'fixed',
        top: '-20%',
        left: '-10%',
        width: '500px',
        height: '500px',
        background: 'rgba(255, 255, 255, 0.08)',
        borderRadius: '50%',
        filter: 'blur(100px)',
        zIndex: 0
      }} />
      
      <div style={{
        position: 'fixed',
        bottom: '-15%',
        right: '-10%',
        width: '600px',
        height: '600px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '50%',
        filter: 'blur(120px)',
        zIndex: 0
      }} />

      {/* Content Container */}
      <div style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: '1400px' }}>
        {/* Header Section */}
        <div style={{
          textAlign: 'center',
          marginBottom: '80px'
        }}>
          <h1 style={{
            fontSize: window.innerWidth > 768 ? '64px' : '40px',
            fontWeight: 900,
            color: 'white',
            marginBottom: '12px',
            textShadow: '0 6px 20px rgba(0,0,0,0.15)',
            lineHeight: 1.2,
            letterSpacing: '-1px'
          }}>
            Welcome to <span style={{ color: '#fbbf24' }}>SnapTick</span>
          </h1>
          
          <p style={{
            fontSize: window.innerWidth > 768 ? '22px' : '16px',
            color: 'rgba(255, 255, 255, 0.95)',
            marginBottom: '24px',
            fontWeight: 400,
            letterSpacing: '0.5px'
          }}>
            Smart Attendance Management Powered by AI
          </p>

          {/* Badge */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255, 255, 255, 0.15)',
            backdropFilter: 'blur(20px)',
            padding: '14px 28px',
            borderRadius: '50px',
            border: '1.5px solid rgba(255, 255, 255, 0.3)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
          }}>
            <span style={{
              color: 'white',
              fontWeight: 700,
              fontSize: '13px',
              letterSpacing: '1.5px',
              textTransform: 'uppercase'
            }}>
              ✨ Capture • Verify • Track
            </span>
          </div>
        </div>

        {/* Role Cards Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth > 768 ? 'repeat(3, 1fr)' : '1fr',
          gap: '36px',
          marginBottom: '60px'
        }}>
          {roles.map((item) => (
            <div
              key={item.role}
              onClick={() => handleRoleSelect(item.role)}
              onMouseEnter={() => setHoveredRole(item.role)}
              onMouseLeave={() => setHoveredRole(null)}
              style={{
                background: item.bgGradient,
                borderRadius: '28px',
                padding: '48px 36px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                transform: hoveredRole === item.role 
                  ? 'translateY(-8px)' 
                  : 'translateY(0)',
                boxShadow: hoveredRole === item.role 
                  ? `0 20px 40px rgba(0, 0, 0, 0.3)` 
                  : '0 10px 30px rgba(0, 0, 0, 0.2)',
                border: '2px solid rgba(255, 255, 255, 0.25)',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Icon Container */}
              <div style={{
                width: '120px',
                height: '120px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.2)',
                border: '3px solid rgba(255, 255, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '60px',
                marginBottom: '24px',
                marginLeft: 'auto',
                marginRight: 'auto',
                transition: 'all 0.3s ease'
              }}>
                {item.iconUnicode}
              </div>

              {/* Text Content */}
              <h3 style={{
                fontSize: '32px',
                fontWeight: 800,
                color: 'white',
                marginBottom: '12px',
                textAlign: 'center',
                letterSpacing: '-0.5px',
                margin: 0
              }}>
                {item.title}
              </h3>

              <p style={{
                fontSize: '16px',
                color: 'rgba(255, 255, 255, 0.85)',
                marginBottom: '36px',
                fontWeight: 500,
                lineHeight: '1.6',
                textAlign: 'center',
                margin: '12px 0 36px 0'
              }}>
                {item.subtitle}
              </p>

              {/* Login Button */}
              <button
                style={{
                  width: '100%',
                  padding: '16px 24px',
                  fontSize: '16px',
                  borderRadius: '14px',
                  border: 'none',
                  fontWeight: 800,
                  color: '#1e3a8a',
                  background: 'white',
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  boxShadow: hoveredRole === item.role 
                    ? '0 8px 20px rgba(0,0,0,0.2)' 
                    : '0 4px 12px rgba(0,0,0,0.15)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  margin: 0
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f0f4f8'
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'white'
                }}
              >
                Login →
              </button>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '13px',
          position: 'relative',
          zIndex: 10,
          letterSpacing: '0.5px'
        }}>
          <p style={{ marginBottom: 0 }}>
            © Copyright <strong style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Code Debuggers</strong> • Smart India Hackathon
          </p>
        </div>
      </div>

      {/* Minimal CSS - Only Hover Effects */}
      <style>{`
        @media (max-width: 768px) {
          h1 {
            font-size: 40px !important;
          }
          
          p {
            font-size: 15px !important;
          }
        }

        * {
          box-sizing: border-box;
        }
      `}</style>
    </div>
  )
}
