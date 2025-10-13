import React, { useState, useEffect, useCallback } from 'react'
import { api } from '../services/api'

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', subject: '' })
  const [loading, setLoading] = useState(false)

  // ---------------- Load classrooms ----------------
  const loadClassrooms = useCallback(async () => {
    try {
      setLoading(true)
      const { data } = await api.get('/classrooms')
      setClassrooms(data || [])
    } catch (e) {
      console.error('Failed to load classrooms', e)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadClassrooms() }, [loadClassrooms])

  // ---------------- Create classroom ----------------
  const createClassroom = async (e) => {
    e.preventDefault()
    if (!formData.name.trim()) return alert('Please enter a classroom name')

    try {
      await api.post('/classrooms', formData)
      setShowModal(false)
      setFormData({ name: '', subject: '' })
      loadClassrooms()
    } catch (e) {
      alert('Failed to create classroom')
      console.error(e)
    }
  }

  return (
    <div style={{ padding: 24 }}>
      {/* Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ fontSize: 24, fontWeight: 600 }}>Classrooms</h2>
        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#3b82f6',
            color: '#fff',
            padding: '10px 20px',
            borderRadius: 8,
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            fontSize: 14
          }}
        >
          + Create Classroom
        </button>
      </div>

      {/* Loading Spinner */}
      {loading ? (
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column',
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: 300,
          padding: 40 
        }}>
          <div style={{ 
            width: 50, 
            height: 50, 
            border: '5px solid #f3f4f6',
            borderTop: '5px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>
            Loading classrooms...
          </div>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      ) : classrooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🏫</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 16, color: '#111827' }}>No Classrooms Yet</div>
          <div style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>Create your first classroom to get started!</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gap: 16,
            gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'
          }}
        >
          {classrooms.map((c) => (
            <div
              key={c.id || c._id}
              style={{
                padding: 20,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 600, color: '#111827' }}>
                {c.name}
              </h3>
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                📚 {c.subject || 'No subject'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Create Classroom Modal */}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: '#fff',
              padding: 32,
              borderRadius: 12,
              width: 400,
              maxWidth: '90%',
              boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, fontWeight: 600 }}>
              Create New Classroom
            </h3>
            <form onSubmit={createClassroom} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  Classroom Name *
                </label>
                <input
                  placeholder="e.g., Computer Science A"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14
                  }}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>
                  Subject
                </label>
                <input
                  placeholder="e.g., Mathematics"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 6,
                    border: '1px solid #d1d5db',
                    fontSize: 14
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  style={{
                    background: '#10b981',
                    color: '#fff',
                    flex: 1,
                    padding: '10px',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    background: '#ef4444',
                    color: '#fff',
                    flex: 1,
                    padding: '10px',
                    borderRadius: 6,
                    border: 'none',
                    fontWeight: 600,
                    cursor: 'pointer',
                    fontSize: 14
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
