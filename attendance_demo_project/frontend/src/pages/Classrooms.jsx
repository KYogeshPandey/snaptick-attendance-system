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
    <div className="mt-4">
      {/* Excel/CSV Upload Section */}
      <div className="card border-0 shadow-sm mb-4 bg-success bg-opacity-10 border-success border-3 border-start">
        <div className="card-body p-4">
          <h5 className="card-title text-success fw-bold mb-3">
            📤 Step 1: Upload Students for {classroomName}
          </h5>
          <form onSubmit={handleUpload} className="d-flex gap-3 align-items-center">
            <input
              key={fileInputKey}
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="form-control form-control-lg"
            />
            <button
              type="submit"
              disabled={!file || uploading}
              className="btn btn-success btn-lg px-4 nowrap-btn btn-hover"
            >
              {uploading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Uploading...
                </>
              ) : (
                '📊 Upload Excel/CSV'
              )}
            </button>
          </form>
          <div className="alert alert-info mt-3 mb-0 border-0 bg-info bg-opacity-10">
            <small className="d-block mb-2">
              💡 Upload <strong>CSV or Excel</strong> with columns: <strong>name, email, roll_no</strong>
            </small>
            <small className="text-muted fst-italic">
              ℹ️ Existing students (matched by email or roll_no) will be updated automatically
            </small>
          </div>
        </div>
      </div>

      {/* ZIP Upload Section */}
      <div className="card border-0 shadow-sm mb-4 bg-warning bg-opacity-10 border-warning border-3 border-start">
        <div className="card-body p-4">
          <h5 className="card-title text-warning fw-bold mb-3">
            📁 Step 2: Upload Student Photos (ZIP)
          </h5>
          <div className="d-flex gap-3 align-items-center">
            <input
              key={fileInputKey + '_zip'}
              type="file"
              accept=".zip"
              onChange={handleZipChange}
              className="form-control form-control-lg"
            />
            <button
              onClick={uploadZip}
              disabled={!zipFile || uploadingZip}
              className="btn btn-warning btn-lg px-4 nowrap-btn btn-hover"
            >
              {uploadingZip ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Uploading...
                </>
              ) : (
                '📁 Upload ZIP'
              )}
            </button>
          </div>

          <div className="alert alert-warning mt-3 mb-0 border-2 border-warning">
            <p className="mb-2 fw-bold text-dark">⚠️ IMPORTANT: Name photos by Roll Number</p>
            <div className="mb-2">
              <span className="badge bg-success me-2">✅ Correct</span>
              <code className="bg-white px-2 py-1 rounded">101.jpg</code>, 
              <code className="bg-white px-2 py-1 rounded ms-1">102.jpg</code>
            </div>
            <div className="mb-2">
              <span className="badge bg-danger me-2">❌ Avoid</span>
              <code className="bg-white px-2 py-1 rounded">rahul_sharma.jpg</code>
            </div>
            <small className="text-muted d-block mt-2">
              📷 Supported formats: .jpg, .jpeg, .png
            </small>
          </div>
        </div>
      </div>

      {/* Students List */}
      <div className="card border-0 shadow-sm">
        <div className="card-header bg-white border-bottom">
          <h5 className="card-title mb-0 py-2 fw-bold">
            👨‍🎓 Students List 
            <span className="badge bg-primary ms-2">{students.length}</span>
          </h5>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }}></div>
              <p className="mt-3 text-muted">Loading students...</p>
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-5 bg-light m-3 rounded">
              <div style={{ fontSize: 64 }}>👨‍🎓</div>
              <p className="text-muted mt-3 mb-0">
                No students yet. Upload an Excel/CSV file to add students.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0 align-middle">
                <thead className="table-light">
                  <tr>
                    <th className="fw-bold">Roll No</th>
                    <th className="fw-bold">Name</th>
                    <th className="fw-bold">Email</th>
                    <th className="text-center fw-bold">Photo</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id}>
                      <td className="fw-semibold">{s.roll_no}</td>
                      <td>{s.name}</td>
                      <td className="text-muted">{s.email}</td>
                      <td className="text-center">
                        <span className={`badge ${s.has_photo ? 'bg-success' : 'bg-danger'} px-3 py-2`}>
                          {s.has_photo ? '✅ Yes' : '❌ No'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
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
    <div className="min-vh-100 bg-light py-4">
      <div className="container-fluid" style={{ maxWidth: '1400px' }}>
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            <h1 className="fw-bold mb-2">🏫 Classrooms</h1>
            <p className="text-muted mb-0">Manage your classrooms and students</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="btn btn-primary btn-lg shadow-sm btn-hover"
          >
            <i className="bi bi-plus-circle me-2"></i>+ Create Classroom
          </button>
        </div>

        {/* Classrooms Grid */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" style={{ width: '4rem', height: '4rem' }}></div>
            <p className="mt-3 text-muted fw-semibold">Loading classrooms...</p>
          </div>
        ) : classrooms.length === 0 ? (
          <div className="card border-0 shadow-sm text-center py-5">
            <div className="card-body">
              <div style={{ fontSize: 80 }}>🏫</div>
              <h3 className="mt-3 fw-bold">No Classrooms Yet</h3>
              <p className="text-muted">Create your first classroom to get started!</p>
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary btn-lg mt-3 btn-hover"
              >
                + Create Classroom
              </button>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {classrooms.map((c) => (
              <div key={c.id || c._id} className="col-md-6 col-lg-4 col-xl-3">
                <div
                  onClick={() => handleClassroomClick(c)}
                  className="card border-0 shadow-sm h-100 classroom-card"
                >
                  <div className="card-body text-center p-4">
                    <div className="classroom-icon mb-3">🏫</div>
                    <h5 className="card-title fw-bold mb-2">{c.name}</h5>
                    <p className="card-text text-muted mb-0">
                      <i className="bi bi-book me-2"></i>
                      {c.subject || 'No subject'}
                    </p>
                  </div>
                  <div className="card-footer bg-light border-0 text-center">
                    <small className="text-muted">Click to manage students</small>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Classroom Modal */}
        {showModal && (
          <div 
            className="modal show d-block" 
            style={{ background: 'rgba(0,0,0,0.75)' }}
            onClick={() => setShowModal(false)}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content shadow-lg" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header bg-light">
                  <h5 className="modal-title fw-bold">🏫 Create New Classroom</h5>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body p-4">
                  <form onSubmit={createClassroom}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold">
                        Classroom Name <span className="text-danger">*</span>
                      </label>
                      <input 
                        type="text" 
                        required 
                        placeholder="e.g., Computer Science A" 
                        value={formData.name} 
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                        className="form-control form-control-lg"
                      />
                    </div>
                    <div className="mb-4">
                      <label className="form-label fw-semibold">Subject</label>
                      <input 
                        type="text" 
                        placeholder="e.g., Mathematics" 
                        value={formData.subject} 
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })} 
                        className="form-control form-control-lg"
                      />
                    </div>
                    <div className="d-flex gap-3">
                      <button type="submit" className="btn btn-success btn-lg flex-fill btn-hover">
                        <i className="bi bi-check-circle me-2"></i>Create
                      </button>
                      <button 
                        type="button" 
                        onClick={() => setShowModal(false)} 
                        className="btn btn-danger btn-lg flex-fill btn-hover"
                      >
                        <i className="bi bi-x-circle me-2"></i>Cancel
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Student Upload Form */}
        {createdClassroomId && (
          <StudentUploadForm 
            classroomId={createdClassroomId} 
            classroomName={createdClassroomName} 
            onUploadComplete={handleUploadComplete} 
          />
        )}
      </div>

      <style>{`
        /* Button Hover - Only for clickable buttons */
        .btn-hover {
          transition: all 0.3s ease;
        }
        .btn-hover:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        }
        
        /* Classroom Card - Only for clickable cards */
        .classroom-card {
          cursor: pointer;
          transition: all 0.3s ease;
          border-left: 4px solid #3b82f6 !important;
        }
        .classroom-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 25px rgba(0,0,0,0.15) !important;
          border-left-color: #2563eb !important;
        }
        
        /* Static Icon - No animation */
        .classroom-icon {
          font-size: 48px;
        }
        
        /* Modal */
        .modal.show {
          display: block !important;
        }
        
        /* No wrap button */
        .nowrap-btn {
          white-space: nowrap;
        }
        
        /* Form Control Focus */
        .form-control:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 0.25rem rgba(59, 130, 246, 0.15);
        }
      `}</style>
    </div>
  );
}
