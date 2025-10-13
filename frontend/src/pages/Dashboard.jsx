import { useState, useEffect } from 'react'
import { api } from '../services/api'
import { Link } from 'react-router-dom'

export default function Dashboard() {
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    try {
      const { data } = await api.get('/analytics/overview')
      setAnalytics(data)
    } catch (e) {
      console.error('Failed to load analytics:', e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <div style={{ fontSize: 48 }}>⏳</div>
        <div style={{ marginTop: 16, color: '#6b7280' }}>Loading dashboard...</div>
      </div>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>

      {/* Quick Stats */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 32 }}>
          <div style={{ padding: 20, background: '#dbeafe', borderRadius: 8, border: '1px solid #60a5fa' }}>
            <div style={{ fontSize: 14, color: '#1e40af', marginBottom: 8 }}>Total Students</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#1e40af' }}>{analytics.total_students}</div>
            <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>
              Across {analytics.total_classrooms} classrooms
            </div>
          </div>

          <div style={{ padding: 20, background: '#d1fae5', borderRadius: 8, border: '1px solid #10b981' }}>
            <div style={{ fontSize: 14, color: '#065f46', marginBottom: 8 }}>Today&apos;s Present</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#065f46' }}>{analytics.today.present}</div>
            <div style={{ fontSize: 12, color: '#10b981', marginTop: 4 }}>
              Out of {analytics.today.total} students
            </div>
          </div>

          <div style={{ padding: 20, background: '#fee2e2', borderRadius: 8, border: '1px solid #ef4444' }}>
            <div style={{ fontSize: 14, color: '#991b1b', marginBottom: 8 }}>Today&apos;s Absent</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#991b1b' }}>{analytics.today.absent}</div>
            <div style={{ fontSize: 12, color: '#ef4444', marginTop: 4 }}>
              {analytics.today.total > 0 ? Math.round(analytics.today.absent / analytics.today.total * 100) : 0}% of students
            </div>
          </div>

          <div style={{ padding: 20, background: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
            <div style={{ fontSize: 14, color: '#92400e', marginBottom: 8 }}>Overall Rate (30 days)</div>
            <div style={{ fontSize: 32, fontWeight: 'bold', color: '#92400e' }}>{analytics.overall_rate}%</div>
            <div style={{ fontSize: 12, color: '#f59e0b', marginTop: 4 }}>
              {analytics.last_30_days.total_records} total records
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <h3>Quick Actions</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        <Link to="/classrooms" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>🏫</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>Manage Classrooms</div>
          </div>
        </Link>

        <Link to="/students" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>👨‍🎓</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>Upload Students</div>
          </div>
        </Link>

        <Link to="/attendance" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>Mark Attendance</div>
          </div>
        </Link>

        <Link to="/analytics" style={{ textDecoration: 'none' }}>
          <div style={{
            padding: 24,
            background: '#fff',
            border: '2px solid #e5e7eb',
            borderRadius: 8,
            textAlign: 'center',
            cursor: 'pointer'
          }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>View Analytics</div>
          </div>
        </Link>
      </div>
    </div>
  )
}
