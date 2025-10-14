import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

function StudentUploadForm({ classroomId, classroomName, onUploadComplete }) {
  const [file, setFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingZip, setUploadingZip] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/students/classroom/${classroomId}`);
      setStudents(data);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoading(false);
    }
  }, [classroomId]);

  useEffect(() => {
    setFile(null);
    setZipFile(null);
    setFileInputKey(Date.now());
    loadStudents();
  }, [classroomId, loadStudents]);

  const handleFileChange = (e) => setFile(e.target.files[0]);
  const handleZipChange = (e) => setZipFile(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return alert('Please select a CSV or Excel file');

    const formData = new FormData();
    formData.append('file', file);

    try {
      setUploading(true);
      const res = await api.post(`/classrooms/${classroomId}/students/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      // ✅ ENHANCED ALERT WITH DETAILED STATS
      const data = res.data;
      alert(
        `${data.message}\n\n` +
        `📊 Summary:\n` +
        `• New Students: ${data.new_students}\n` +
        `• Updated Students: ${data.updated_students}\n` +
        `• Skipped: ${data.skipped}\n` +
        `• Total: ${data.total_students}`
      );
      
      setFile(null);
      setFileInputKey(Date.now());
      loadStudents();
      if (onUploadComplete) onUploadComplete();
    } catch (error) {
      console.error('Upload error:', error);
      alert(error.response?.data?.message || 'Student upload failed!');
    } finally {
      setUploading(false);
    }
  };

  const uploadZip = async () => {
    if (!zipFile) return alert('Please select a ZIP file');

    const formData = new FormData();
    formData.append('file', zipFile);
    formData.append('classroom_id', classroomId);

    try {
      setUploadingZip(true);
      const { data } = await api.post('/students/upload-photos-zip', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      alert(data.message);
      if (data.unmatched && data.unmatched.length > 0) {
        console.log('Unmatched photos:', data.unmatched);
        alert(`${data.unmatched.length} photos could not be matched. Check console for details.`);
      }
      setZipFile(null);
      setFileInputKey(Date.now());
      loadStudents();
    } catch (error) {
      console.error('ZIP upload failed:', error);
      alert('Upload failed: ' + (error.response?.data?.message || error.message));
    } finally {
      setUploadingZip(false);
    }
  };

  return (
    <div style={{ marginTop: 32 }}>
      {/* Excel/CSV Upload Section */}
      <div style={{
        padding: 24,
        background: '#f0fdf4',
        border: '2px dashed #10b981',
        borderRadius: 12,
        marginBottom: 24
      }}>
        <h3 style={{ marginTop: 0, color: '#065f46', fontSize: 18, fontWeight: 600 }}>
          📤 Step 1: Upload Students for {classroomName}
        </h3>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
          <input
            key={fileInputKey}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #10b981',
              borderRadius: 6,
              fontSize: 14
            }}
          />
          <button
            type="submit"
            disabled={!file || uploading}
            style={{
              background: uploading ? '#9ca3af' : '#10b981',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: 14
            }}
          >
            {uploading ? 'Uploading...' : 'Upload Excel/CSV'}
          </button>
        </form>
        <p style={{ marginTop: 12, fontSize: 13, color: '#6b7280' }}>
          💡 Upload <strong>CSV or Excel</strong> with columns: <strong>name, email, roll_no</strong> (case-insensitive)
        </p>
        <p style={{ marginTop: 8, fontSize: 12, color: '#059669', fontStyle: 'italic' }}>
          ℹ️ Existing students (matched by email or roll_no) will be updated automatically
        </p>
      </div>

      {/* ZIP Upload Section */}
      <div style={{
        padding: 24,
        background: '#fef3c7',
        border: '2px solid #f59e0b',
        borderRadius: 12,
        marginBottom: 24
      }}>
        <h3 style={{ marginTop: 0, color: '#78350f', fontSize: 18, fontWeight: 600 }}>
          📁 Step 2: Upload Student Photos (ZIP)
        </h3>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 16 }}>
          <input
            key={fileInputKey + '_zip'}
            type="file"
            accept=".zip"
            onChange={handleZipChange}
            style={{
              flex: 1,
              padding: '10px 12px',
              border: '1px solid #f59e0b',
              borderRadius: 6,
              fontSize: 14
            }}
          />
          <button
            onClick={uploadZip}
            disabled={!zipFile || uploadingZip}
            style={{
              background: uploadingZip ? '#9ca3af' : '#8b5cf6',
              color: '#fff',
              padding: '10px 20px',
              border: 'none',
              borderRadius: 6,
              fontWeight: 600,
              cursor: uploadingZip ? 'not-allowed' : 'pointer',
              fontSize: 14
            }}
          >
            {uploadingZip ? 'Uploading...' : 'Upload ZIP'}
          </button>
        </div>

        <div style={{
          marginTop: 12,
          padding: 12,
          background: '#fef9c3',
          border: '1px solid #fbbf24',
          borderRadius: 6
        }}>
          <p style={{ fontSize: 13, color: '#92400e', margin: 0, lineHeight: 1.8 }}>
            <strong>⚠️ IMPORTANT: Name photos by Roll Number</strong><br/>
            <span style={{ display: 'block', marginTop: 6 }}>
              ✅ <strong>Correct:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>101.jpg</code>, <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>102.jpg</code>
            </span>
            <span style={{ display: 'block', marginTop: 4 }}>
              ❌ <strong>Avoid:</strong> <code style={{ background: '#fff', padding: '2px 6px', borderRadius: 3 }}>rahul_sharma.jpg</code>
            </span>
            <span style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
              📷 Supported: .jpg, .jpeg, .png
            </span>
          </p>
        </div>
      </div>

      {/* Students List */}
      <div style={{
        padding: 24,
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 12
      }}>
        <h3 style={{ marginTop: 0, fontSize: 18, fontWeight: 600 }}>
          👨‍🎓 Students List ({students.length})
        </h3>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
            <div style={{
              width: 40,
              height: 40,
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #3b82f6',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
          </div>
        ) : students.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', background: '#f9fafb', borderRadius: 8 }}>
            <div style={{ fontSize: 48 }}>👨‍🎓</div>
            <p style={{ color: '#6b7280', marginTop: 16 }}>
              No students yet. Upload an Excel/CSV file to add students.
            </p>
          </div>
        ) : (
          <table style={{
            width: '100%',
            borderCollapse: 'collapse',
            border: '1px solid #e5e7eb',
            marginTop: 16
          }}>
            <thead style={{ background: '#f3f4f6' }}>
              <tr>
                <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Roll No</th>
                <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Name</th>
                <th style={{ padding: 12, textAlign: 'left', border: '1px solid #e5e7eb', fontWeight: 600 }}>Email</th>
                <th style={{ padding: 12, textAlign: 'center', border: '1px solid #e5e7eb', fontWeight: 600 }}>Photo</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.id}>
                  <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{s.roll_no}</td>
                  <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{s.name}</td>
                  <td style={{ padding: 12, border: '1px solid #e5e7eb' }}>{s.email}</td>
                  <td style={{
                    padding: 12,
                    border: '1px solid #e5e7eb',
                    textAlign: 'center',
                    color: s.has_photo ? '#10b981' : '#ef4444',
                    fontWeight: 500
                  }}>
                    {s.has_photo ? '✅ Yes' : '❌ No'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default function Classrooms() {
  const [classrooms, setClassrooms] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', subject: '' });
  const [loading, setLoading] = useState(false);
  const [createdClassroomId, setCreatedClassroomId] = useState(null);
  const [createdClassroomName, setCreatedClassroomName] = useState('');

  const loadClassrooms = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/classrooms');
      setClassrooms(data || []);
    } catch (e) {
      console.error('Failed to load classrooms', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClassrooms();
  }, [loadClassrooms]);

  const createClassroom = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      return alert('Please enter a classroom name');
    }
    try {
      const res = await api.post('/classrooms', formData);
      setShowModal(false);
      setFormData({ name: '', subject: '' });
      setCreatedClassroomId(res.data.classroom.id);
      setCreatedClassroomName(res.data.classroom.name);
      loadClassrooms();
    } catch (e) {
      alert('Failed to create classroom');
      console.error(e);
    }
  };

  const handleUploadComplete = () => {
    setCreatedClassroomId(null);
    setCreatedClassroomName('');
  };

  const handleClassroomClick = (classroom) => {
    setCreatedClassroomId(classroom.id);
    setCreatedClassroomName(classroom.name);
  };

  return (
    <div style={{ padding: 24 }}>
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
            fontSize: 14,
          }}
        >
          + Create Classroom
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: 300, padding: 40 }}>
          <div style={{ width: 50, height: 50, border: '5px solid #f3f4f6', borderTop: '5px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <div style={{ marginTop: 16, color: '#6b7280', fontSize: 14 }}>Loading classrooms...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); }}`}</style>
        </div>
      ) : classrooms.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#f9fafb', borderRadius: 12 }}>
          <div style={{ fontSize: 48 }}>🏫</div>
          <div style={{ fontSize: 18, fontWeight: 500, marginTop: 16, color: '#111827' }}>No Classrooms Yet</div>
          <div style={{ color: '#6b7280', marginTop: 8, fontSize: 14 }}>Create your first classroom to get started!</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
          {classrooms.map((c) => (
            <div
              key={c.id || c._id}
              onClick={() => handleClassroomClick(c)}
              style={{
                padding: 20,
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                background: '#fff',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                transition: 'all 0.2s',
                cursor: 'pointer',
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
              <h3 style={{ marginBottom: 8, fontSize: 18, fontWeight: 600, color: '#111827' }}>{c.name}</h3>
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>📚 {c.subject || 'No subject'}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div onClick={() => setShowModal(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', padding: 32, borderRadius: 12, width: 400, maxWidth: '90%', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ marginTop: 0, marginBottom: 20, fontSize: 20, fontWeight: 600 }}>Create New Classroom</h3>
            <form onSubmit={createClassroom} style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Classroom Name *</label>
                <input type="text" required placeholder="e.g., Computer Science A" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 500, fontSize: 14 }}>Subject</label>
                <input type="text" placeholder="e.g., Mathematics" value={formData.subject} onChange={(e) => setFormData({ ...formData, subject: e.target.value })} style={{ width: '100%', padding: '10px 12px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }} />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button type="submit" style={{ flex: 1, background: '#10b981', color: '#fff', padding: 10, borderRadius: 6, border: 'none', fontWeight: 600 }}>Create</button>
                <button type="button" onClick={() => setShowModal(false)} style={{ flex: 1, background: '#ef4444', color: '#fff', borderRadius: 6, border: 'none', padding: 10, fontWeight: 600 }}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {createdClassroomId && (
        <StudentUploadForm classroomId={createdClassroomId} classroomName={createdClassroomName} onUploadComplete={handleUploadComplete} />
      )}
    </div>
  );
}
