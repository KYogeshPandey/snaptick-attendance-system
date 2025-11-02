// src/pages/LandingPage.jsx - FULL VIDEO WITH CONTENT OVERLAY
import React from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
      {/* Hero Section - FULL VIDEO */}
      <div style={{ 
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        paddingTop: '60px'
      }}>
        {/* Full Background Video - COMPLETE SCREEN */}
        <video
          autoPlay
          muted
          loop
          playsInline
          style={{
            position: 'absolute',
            top: '0',
            left: 0,
            width: '100%',
            height: '100%',
            
            objectFit: 'cover',
            zIndex: 0
          }}
        >
          <source src="/video.mp4" type="video/mp4" />
        </video>

        {/* Dark Overlay - Fade */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.4) 0%, rgba(118, 75, 162, 0.4) 100%)',
          zIndex: 1
        }} />

        {/* Content - CENTERED ON VIDEO */}
        <div style={{ 
          position: 'relative', 
          zIndex: 2, 
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          minHeight: 'calc(100vh - 60px)',
          padding: '60px 20px'
        }}>
          <div style={{ maxWidth: '900px' }}>
            {/* Heading */}
            <h1 style={{ 
              fontSize: window.innerWidth > 768 ? '64px' : '40px', 
              fontWeight: 'bold', 
              marginBottom: '24px', 
              animation: 'fadeInUp 1s ease-out',
              lineHeight: '1.2',
              color: 'white',
              textShadow: '0 4px 12px rgba(0,0,0,0.4)'
            }}>
              Smart Attendance Made Simple
            </h1>

            {/* Description */}
            <p style={{ 
              fontSize: '20px', 
              marginBottom: '48px', 
              opacity: 0.95,
              textShadow: '0 2px 8px rgba(0,0,0,0.3)',
              lineHeight: '1.6',
              color: 'white',
              maxWidth: '700px',
              margin: '0 auto 48px'
            }}>
              Face recognition powered attendance system for modern education. 
              Fast, accurate, and effortless tracking.
            </p>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: '16px', marginBottom: '48px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link 
                to="/role-selection" 
                style={{
                  padding: '18px 40px',
                  background: 'white',
                  color: '#667eea',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  display: 'inline-block',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)'
                  e.target.style.boxShadow = '0 12px 30px rgba(0,0,0,0.4)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.3)'
                }}
              >
                🚀 Get Started
              </Link>
              <a 
                href="#features"
                style={{
                  padding: '18px 40px',
                  background: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  textDecoration: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  cursor: 'pointer',
                  transition: 'all 0.3s',
                  border: '2px solid rgba(255, 255, 255, 0.5)',
                  display: 'inline-block',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 8px 20px rgba(0,0,0,0.2)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-3px)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.3)'
                  e.target.style.boxShadow = '0 12px 30px rgba(0,0,0,0.3)'
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)'
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)'
                  e.target.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)'
                }}
              >
                Learn More
              </a>
            </div>

            {/* Stats */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 1fr 1fr', 
              gap: '32px',
              textShadow: '0 2px 8px rgba(0,0,0,0.4)',
              color: 'white'
            }}>
              <div>
                <h3 style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '8px' }}>96.4%</h3>
                <small style={{ opacity: 0.9, fontSize: '16px' }}>Accuracy</small>
              </div>
              <div>
                <h3 style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '8px' }}>&lt;15s</h3>
                <small style={{ opacity: 0.9, fontSize: '16px' }}>Processing</small>
              </div>
              <div>
                <h3 style={{ fontSize: '40px', fontWeight: 'bold', marginBottom: '8px' }}>1000+</h3>
                <small style={{ opacity: 0.9, fontSize: '16px' }}>Users</small>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div id="features" style={{ 
        background: 'rgba(255, 255, 255, 0.08)',
        padding: '80px 20px',
        backdropFilter: 'blur(10px)',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', color: 'white', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '16px' }}>Why Choose SnapTick?</h2>
            <p style={{ fontSize: '18px', opacity: 0.9 }}>Advanced face recognition technology for seamless attendance management</p>
          </div>

          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr 1fr' : '1fr', 
            gap: '40px' 
          }}>
            {[
              { icon: '🎯', title: 'MTCNN Accuracy', desc: '96.4% face recognition accuracy with advanced AI' },
              { icon: '⚡', title: 'Lightning Fast', desc: 'Process entire classrooms in under 15 seconds' },
              { icon: '📊', title: 'Real-time Analytics', desc: 'Instant attendance reports and insights' }
            ].map((feature, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '16px',
                  padding: '40px',
                  textAlign: 'center',
                  transition: 'all 0.3s',
                  cursor: 'pointer',
                  boxShadow: '0 15px 40px rgba(0, 0, 0, 0.15)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-12px)'
                  e.currentTarget.style.boxShadow = '0 25px 50px rgba(0, 0, 0, 0.25)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 15px 40px rgba(0, 0, 0, 0.15)'
                }}
              >
                <div style={{ fontSize: '56px', marginBottom: '20px' }}>{feature.icon}</div>
                <h5 style={{ fontWeight: 'bold', marginBottom: '12px', color: '#333', fontSize: '20px' }}>{feature.title}</h5>
                <p style={{ color: '#6b7280', margin: 0, lineHeight: '1.6' }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* About Section */}
      <div id="about" style={{ padding: '80px 20px', background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr', 
            gap: '60px', 
            alignItems: 'center' 
          }}>
            <div style={{ color: 'white' }}>
              <h2 style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '24px' }}>Built for Modern Education</h2>
              <p style={{ fontSize: '18px', marginBottom: '24px', opacity: 0.9, lineHeight: '1.6' }}>
                SnapTick revolutionizes attendance tracking with cutting-edge face recognition technology, 
                making the process faster, more accurate, and completely hassle-free.
              </p>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {[
                  'No more manual roll calls',
                  'Instant face recognition',
                  'Automated record keeping',
                  'Smart attendance insights'
                ].map((item, idx) => (
                  <li key={idx} style={{ marginBottom: '18px', display: 'flex', alignItems: 'center' }}>
                    <span style={{
                      background: '#28a745',
                      color: 'white',
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '16px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      fontSize: '18px'
                    }}>✓</span>
                    <span style={{ fontSize: '18px' }}>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div style={{
              background: 'rgba(255, 255, 255, 0.97)',
              borderRadius: '16px',
              padding: '50px',
              textAlign: 'center',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.2)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ fontSize: '100px', marginBottom: '24px' }}>📸</div>
              <h4 style={{ fontWeight: 'bold', marginBottom: '32px', color: '#333', fontSize: '24px' }}>How It Works</h4>
              <ol style={{ textAlign: 'left', paddingLeft: '20px', color: '#333', lineHeight: '2' }}>
                <li style={{ marginBottom: '20px', fontSize: '16px' }}><strong>Capture</strong> - Take a class photo</li>
                <li style={{ marginBottom: '20px', fontSize: '16px' }}><strong>Recognize</strong> - AI identifies students instantly</li>
                <li style={{ marginBottom: '20px', fontSize: '16px' }}><strong>Record</strong> - Attendance saved automatically</li>
                <li style={{ fontSize: '16px' }}><strong>Analyze</strong> - Get detailed insights</li>
              </ol>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer style={{ 
        background: 'rgba(0, 0, 0, 0.4)', 
        padding: '40px 20px',
        textAlign: 'center',
        color: 'white',
        borderTop: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        <p style={{ marginBottom: '8px', fontWeight: 'bold', fontSize: '16px' }}>© 2025 SnapTick - Smart Attendance System</p>
        <p style={{ fontSize: '13px', opacity: 0.7, margin: 0 }}>
          Powered by MTCNN Face Recognition
        </p>
      </footer>

      <style>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 768px) {
          h1 {
            font-size: 40px !important;
          }
          
          h2 {
            font-size: 32px !important;
          }

          h4 {
            font-size: 20px !important;
          }
        }
      `}</style>
    </div>
  )
}
