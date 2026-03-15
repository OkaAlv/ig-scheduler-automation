import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const navigate = useNavigate();

  // --- STATE UNTUK MENU SIDEBAR ---
  const [activeTab, setActiveTab] = useState('ANTREAN'); 

  // --- STATE STATISTIK ---
  const [stats, setStats] = useState({ total: 0, submitted: 0, approved: 0, published: 0, rejected: 0 });
  const [filterDate, setFilterDate] = useState('');

  // --- STATE GANTI PASSWORD ---
  const [newPassword, setNewPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // --- MENGAMBIL DAN MEMBONGKAR TOKEN JWT ---
  const token = localStorage.getItem('jwt_token');
  let currentUser: any = null;

  if (!token) {
    navigate('/login');
    return null; 
  } else {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      currentUser = JSON.parse(window.atob(base64));
    } catch (e) {
      console.error("Gagal membaca token", e);
    }
  }

  // --- LOGIKA ROLE ---
  const userRole = currentUser?.role?.toUpperCase() || 'EDITOR';
  const isAdmin = userRole === 'ADMIN';       // Oka
  const isApprover = userRole === 'APPROVER'; // Dedi
  const isEditor = userRole === 'EDITOR';     // Afifah

  const canApproveOrReject = isAdmin || isApprover;
  const canSubmit = isEditor || isAdmin;

  // --- STATE MODAL ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [caption, setCaption] = useState('');
  const [contentType, setContentType] = useState('CAROUSEL');
  const [scheduledTime, setScheduledTime] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);

  // --- FUNGSI UTAMA API ---
  // --- FUNGSI UTAMA API ---
  const fetchPosts = async () => {
    try {
      // 1. Ambil data tabel antrean
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/posts`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const dataList = response.data.data || response.data;
      setPosts(Array.isArray(dataList) ? dataList : []);

      // 2. Ambil data statistik untuk kartu
      const statsResponse = await axios.get(`${import.meta.env.VITE_API_URL}/posts/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsResponse.data.data);
    } catch (error) {
      console.error('Gagal mengambil data:', error);
    }
  };

  useEffect(() => { fetchPosts(); }, []);

  const handleSyncDrive = async () => {
    setLoading(true);
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/drive/sync`,
        { user_id: currentUser?.sub }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      alert('✅ Sukses: ' + response.data.message);
      fetchPosts(); 
    } catch (error: any) {
      alert('❌ Sinkronisasi Gagal: ' + (error.response?.data?.message || 'Terjadi kesalahan'));
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (post: any) => {
    setSelectedPost(post);
    setCaption(post.caption || '');
    setContentType(post.content_type || 'CAROUSEL');
    setIsRejecting(false);
    setRejectReason('');
    
    if (post.scheduled_time) {
      const date = new Date(post.scheduled_time);
      const tzOffset = date.getTimezoneOffset() * 60000;
      setScheduledTime(new Date(date.getTime() - tzOffset).toISOString().slice(0, 16));
    } else {
      setScheduledTime('');
    }
    setIsModalOpen(true);
  };

  const savePostChanges = async () => {
    await axios.patch(`${import.meta.env.VITE_API_URL}/posts/${selectedPost.id}`, {
      caption: caption,
      content_type: contentType,
      scheduled_time: scheduledTime ? new Date(scheduledTime).toISOString() : null,
    }, { headers: { Authorization: `Bearer ${token}` } });
  };

  const handleSubmitToApprover = async () => {
    try {
      await savePostChanges();
      await axios.post(`${import.meta.env.VITE_API_URL}/posts/${selectedPost.id}/submit`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('✅ Draf berhasil dikirim ke Approver!');
      setIsModalOpen(false);
      fetchPosts();
    } catch (error: any) {
      alert('❌ Gagal mengirim: ' + error.response?.data?.message);
    }
  };

  const handleApprove = async () => {
    if (!scheduledTime) return alert('⚠️ Mohon isi jadwal tayangnya dulu!');
    try {
      await savePostChanges();
      await axios.post(`${import.meta.env.VITE_API_URL}/posts/${selectedPost.id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('🎉 Disetujui! Robot akan mengeksekusinya sesuai jadwal.');
      setIsModalOpen(false);
      fetchPosts();
    } catch (error: any) {
      alert('❌ Gagal menyetujui: ' + error.response?.data?.message);
    }
  };

  const handleReject = async () => {
    if (!rejectReason) return alert('⚠️ Harap isi alasan penolakan!');
    try {
      await axios.post(`${import.meta.env.VITE_API_URL}/posts/${selectedPost.id}/reject`, { reason: rejectReason }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert('🔙 Postingan dikembalikan ke Editor untuk revisi.');
      setIsModalOpen(false);
      fetchPosts();
    } catch (error: any) {
      alert('❌ Gagal menolak: ' + error.response?.data?.message);
    }
  };

  // --- FUNGSI GANTI PASSWORD BARU ---
  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      return alert('⚠️ Password baru harus minimal 6 karakter!');
    }

    setIsChangingPassword(true);
    try {
      await axios.patch(`${import.meta.env.VITE_API_URL}/auth/change-password`, 
        { newPassword: newPassword }, 
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('✅ Berhasil! Password Anda telah diubah. Silakan login kembali dengan password baru.');
      handleLogout(); // Tendang user keluar setelah password diganti
      
    } catch (error: any) {
      alert('❌ Gagal mengganti password: ' + (error.response?.data?.message || 'Terjadi kesalahan'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  // --- FILTERING DATA UNTUK TAB ---
  const antreanPosts = posts.filter(p => p.status !== 'PUBLISHED');
  
  // Logika Filter Tanggal untuk Riwayat
  const riwayatPosts = posts.filter(p => {
    // 1. Pastikan statusnya PUBLISHED
    if (p.status !== 'PUBLISHED') return false;
    
    // 2. Jika user memilih tanggal, cocokkan dengan jadwal tayang
    if (filterDate && p.scheduled_time) {
      const postDate = p.scheduled_time.split('T')[0]; // Potong jamnya, ambil YYYY-MM-DD saja
      return postDate === filterDate;
    }
    
    return true; // Tampilkan semua jika tidak ada tanggal yang dipilih
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f4f7fe', fontFamily: 'sans-serif' }}>
      
      {/* ========================================== */}
      {/* 1. SIDEBAR KIRI */}
      {/* ========================================== */}
      <div style={{ width: '260px', backgroundColor: '#111c44', color: 'white', padding: '20px', display: 'flex', flexDirection: 'column', transition: '0.3s' }}>
        <div style={{ paddingBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', letterSpacing: '1px' }}>🏢 Diskominfo</h2>
          <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#a0aec0' }}>Auto-Poster System</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
          <div 
            onClick={() => setActiveTab('ANTREAN')}
            style={{ padding: '12px 15px', backgroundColor: activeTab === 'ANTREAN' ? '#4318ff' : 'transparent', color: activeTab === 'ANTREAN' ? 'white' : '#a0aec0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
            📊 Antrean Postingan
          </div>
          <div 
            onClick={() => setActiveTab('RIWAYAT')}
            style={{ padding: '12px 15px', backgroundColor: activeTab === 'RIWAYAT' ? '#4318ff' : 'transparent', color: activeTab === 'RIWAYAT' ? 'white' : '#a0aec0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
            🗂️ Riwayat Terbit
          </div>
          <div 
            onClick={() => setActiveTab('AKUN')}
            style={{ padding: '12px 15px', backgroundColor: activeTab === 'AKUN' ? '#4318ff' : 'transparent', color: activeTab === 'AKUN' ? 'white' : '#a0aec0', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.2s' }}>
            ⚙️ Pengaturan Akun
          </div>
        </div>

        <button onClick={handleLogout} style={{ padding: '12px', backgroundColor: 'transparent', color: '#ff4d4f', border: '1px solid #ff4d4f', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: '0.3s' }}>
          🚪 Keluar (Logout)
        </button>
      </div>

      {/* ========================================== */}
      {/* 2. KONTEN UTAMA (KANAN) */}
      {/* ========================================== */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* NAVBAR ATAS */}
        <div style={{ height: '70px', backgroundColor: 'white', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 30px', boxShadow: '0 2px 10px rgba(0,0,0,0.02)' }}>
          <h3 style={{ margin: 0, color: '#2b3674' }}>
            {activeTab === 'ANTREAN' ? 'Manajemen Antrean' : activeTab === 'RIWAYAT' ? 'Riwayat Publikasi' : 'Profil & Pengaturan'}
          </h3>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 'bold', color: '#2b3674', fontSize: '14px' }}>{currentUser?.email}</div>
              <div style={{ fontSize: '12px', color: isAdmin ? '#dc3545' : isApprover ? '#28a745' : '#007bff', fontWeight: 'bold' }}>{userRole}</div>
            </div>
            <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#4318ff', color: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '18px' }}>
              {currentUser?.email.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        {/* AREA KONTEN TENGAH */}
        <div style={{ padding: '30px', overflowY: 'auto' }}>
          
          {/* ------------------------------------------- */}
          {/* TAB 1: ANTREAN POSTINGAN */}
          {/* ------------------------------------------- */}
          {activeTab === 'ANTREAN' && (
            <>
            {/* 📈 WIDGET KARTU STATISTIK (Sekarang 5 Kolom) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '30px' }}>
                
                <div style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderBottom: '4px solid #4318ff' }}>
                  <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>TOTAL DRAF DRIVE</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b3674' }}>{stats.total}</div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderBottom: '4px solid #f6ad55' }}>
                  <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>MENUNGGU REVIEW</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dd6b20' }}>{stats.submitted}</div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderBottom: '4px solid #48bb78' }}>
                  <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>SIAP TAYANG</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2f855a' }}>{stats.approved}</div>
                </div>

                <div style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderBottom: '4px solid #e53e3e' }}>
                  <div style={{ color: '#a0aec0', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>PERLU REVISI</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#c53030' }}>{stats.rejected}</div>
                </div>

                {/* 🌟 KARTU BARU: TOTAL PUBLISH */}
                <div style={{ backgroundColor: 'white', padding: '15px 20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.03)', borderBottom: '4px solid #3182ce', backgroundImage: 'linear-gradient(to right bottom, #ffffff, #f0f7ff)' }}>
                  <div style={{ color: '#3182ce', fontSize: '11px', fontWeight: 'bold', marginBottom: '5px' }}>SUKSES TERBIT</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#2b6cb0' }}>{stats.published}</div>
                </div>

              </div>

              {(isAdmin || isEditor) && (
                <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 5px 14px rgba(0,0,0,0.05)', marginBottom: '30px', borderLeft: '5px solid #4318ff' }}>
                  <h3 style={{ marginTop: 0, color: '#2b3674' }}>📂 Tarik Data Baru</h3>
                  <p style={{ color: '#a0aec0', fontSize: '14px', marginBottom: '20px' }}>Robot akan memindai folder Google Drive dan memasukkannya ke antrean ini.</p>
                  <button onClick={handleSyncDrive} disabled={loading} style={{ padding: '12px 24px', backgroundColor: loading ? '#cbd5e1' : '#4318ff', color: 'white', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 'bold', boxShadow: '0 4px 10px rgba(67, 24, 255, 0.2)' }}>
                    {loading ? '⏳ Sedang Memindai...' : '🔄 Sinkronisasi Google Drive'}
                  </button>
                </div>
              )}

              <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 5px 14px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#2b3674', marginBottom: '20px' }}>📋 Antrean Publikasi</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f4f7fe', color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left' }}>
                      <th style={{ padding: '15px', borderRadius: '8px 0 0 8px' }}>Materi Konten</th>
                      <th style={{ padding: '15px' }}>Status</th>
                      <th style={{ padding: '15px' }}>Jadwal Tayang</th>
                      <th style={{ padding: '15px', borderRadius: '0 8px 8px 0', textAlign: 'center' }}>Tindakan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {antreanPosts.length === 0 ? (
                      <tr><td colSpan={4} style={{ padding: '30px', textAlign: 'center', color: '#a0aec0' }}>Tidak ada antrean saat ini.</td></tr>
                    ) : (
                      antreanPosts.map((post) => (
                        <tr key={post.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ padding: '15px' }}>
                            <div style={{ fontWeight: 'bold', color: '#2b3674', marginBottom: '5px', fontSize: '14px' }}>{post.folder_name || post.title || `Folder: ${post.drive_folder_id}`}</div>
                            <a href={`https://drive.google.com/drive/folders/${post.drive_folder_id}`} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', color: '#4318ff', textDecoration: 'none', fontSize: '12px', fontWeight: 'bold' }}>🔍 Pratinjau Drive ↗</a>
                          </td>
                          <td style={{ padding: '15px' }}>
                            <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: post.status === 'APPROVED' ? '#d4edda' : post.status === 'REJECTED' ? '#f8d7da' : '#fff3cd', color: post.status === 'APPROVED' ? '#155724' : post.status === 'REJECTED' ? '#721c24' : '#856404' }}>{post.status}</span>
                          </td>
                          <td style={{ padding: '15px', color: '#718096', fontSize: '14px', fontWeight: '500' }}>{post.scheduled_time ? new Date(post.scheduled_time).toLocaleString('id-ID') : '-'}</td>
                          <td style={{ padding: '15px', textAlign: 'center' }}>
                            <button onClick={() => openEditModal(post)} style={{ padding: '8px 16px', backgroundColor: '#e2e8f0', color: '#2b3674', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>⚙️ Buka Panel</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* ------------------------------------------- */}
          {/* TAB 2: RIWAYAT TERBIT */}
          {/* ------------------------------------------- */}
          {/* ------------------------------------------- */}
          {/* TAB 2: RIWAYAT TERBIT */}
          {/* ------------------------------------------- */}
          {activeTab === 'RIWAYAT' && (
            <div style={{ backgroundColor: 'white', padding: '25px', borderRadius: '15px', boxShadow: '0 5px 14px rgba(0,0,0,0.05)' }}>
              
              {/* HEADER & FILTER KALENDER */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '15px' }}>
                <h3 style={{ margin: 0, color: '#2b3674' }}>🗂️ Riwayat Postingan Berhasil Terbit</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', backgroundColor: '#f4f7fe', padding: '8px 15px', borderRadius: '10px' }}>
                  <label style={{ fontSize: '13px', fontWeight: 'bold', color: '#2b3674' }}>📅 Cek Tanggal:</label>
                  <input 
                    type="date" 
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', color: '#2b3674', fontWeight: 'bold', outline: 'none' }}
                  />
                  {filterDate && (
                    <button onClick={() => setFilterDate('')} style={{ padding: '8px 12px', backgroundColor: '#ff4d4f', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px' }}>
                      ✖ Reset
                    </button>
                  )}
                </div>
              </div>

              {/* INDIKATOR PENCARIAN */}
              {filterDate && (
                <div style={{ marginBottom: '20px', padding: '12px 15px', backgroundColor: '#ebf8ff', borderLeft: '4px solid #3182ce', borderRadius: '8px', fontSize: '14px', color: '#2b6cb0' }}>
                  Menemukan <strong>{riwayatPosts.length} postingan</strong> yang terbit pada tanggal <strong>{new Date(filterDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                </div>
              )}

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f4f7fe', color: '#a0aec0', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '1px', textAlign: 'left' }}>
                    <th style={{ padding: '15px', borderRadius: '8px 0 0 8px' }}>Judul Konten / Folder</th>
                    <th style={{ padding: '15px' }}>Status</th>
                    <th style={{ padding: '15px', borderRadius: '0 8px 8px 0' }}>Waktu Terbit</th>
                  </tr>
                </thead>
                <tbody>
                  {riwayatPosts.length === 0 ? (
                    <tr>
                      <td colSpan={3} style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>
                        {filterDate ? 'Tidak ada postingan yang terbit pada tanggal tersebut.' : 'Belum ada postingan yang diterbitkan oleh sistem.'}
                      </td>
                    </tr>
                  ) : (
                    riwayatPosts.map((post) => (
                      <tr key={post.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                        <td style={{ padding: '15px' }}>
                          <div style={{ fontWeight: 'bold', color: '#2b3674', fontSize: '14px' }}>{post.folder_name || post.title || `Folder: ${post.drive_folder_id}`}</div>
                          {post.caption && <div style={{ fontSize: '12px', color: '#718096', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '300px' }}>{post.caption}</div>}
                        </td>
                        <td style={{ padding: '15px' }}>
                          <span style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 'bold', backgroundColor: '#cce5ff', color: '#004085' }}>✅ {post.status}</span>
                        </td>
                        <td style={{ padding: '15px', color: '#718096', fontSize: '14px', fontWeight: '500' }}>
                          {post.scheduled_time ? new Date(post.scheduled_time).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* ------------------------------------------- */}
          {/* TAB 3: PENGATURAN AKUN */}
          {/* ------------------------------------------- */}
          {activeTab === 'AKUN' && (
            <div style={{ display: 'flex', gap: '30px', alignItems: 'flex-start' }}>
              {/* Kartu Profil */}
              <div style={{ flex: 1, backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 14px rgba(0,0,0,0.05)', textAlign: 'center' }}>
                <div style={{ width: '100px', height: '100px', borderRadius: '50%', backgroundColor: '#f4f7fe', color: '#4318ff', display: 'flex', justifyContent: 'center', alignItems: 'center', fontWeight: 'bold', fontSize: '40px', margin: '0 auto 20px auto', border: '4px solid #4318ff' }}>
                  {currentUser?.email.charAt(0).toUpperCase()}
                </div>
                <h2 style={{ margin: '0 0 5px 0', color: '#2b3674' }}>{currentUser?.email}</h2>
                <div style={{ display: 'inline-block', padding: '5px 15px', backgroundColor: isAdmin ? '#f8d7da' : isApprover ? '#d4edda' : '#cce5ff', color: isAdmin ? '#721c24' : isApprover ? '#155724' : '#004085', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold', marginTop: '10px' }}>
                  HAK AKSES: {userRole}
                </div>
              </div>

              {/* Form Ganti Password yang Sudah Hidup */}
              <div style={{ flex: 2, backgroundColor: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 14px rgba(0,0,0,0.05)' }}>
                <h3 style={{ marginTop: 0, color: '#2b3674', borderBottom: '2px solid #f4f7fe', paddingBottom: '15px', marginBottom: '20px' }}>Keamanan Akun</h3>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#a0aec0' }}>EMAIL TERDAFTAR</label>
                  <input type="email" value={currentUser?.email} disabled style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#f8f9fa', color: '#6c757d', fontWeight: 'bold' }} />
                </div>
                
                <div style={{ marginBottom: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#a0aec0' }}>PASSWORD BARU</label>
                  <input 
                    type="password" 
                    placeholder="Ketik password baru Anda di sini..." 
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#2b3674' }} 
                  />
                </div>
                
                <button 
                  onClick={handleChangePassword}
                  disabled={isChangingPassword || !newPassword} 
                  style={{ padding: '12px 24px', backgroundColor: isChangingPassword || !newPassword ? '#cbd5e1' : '#4318ff', color: 'white', border: 'none', borderRadius: '8px', cursor: isChangingPassword || !newPassword ? 'not-allowed' : 'pointer', fontWeight: 'bold', marginTop: '10px', transition: '0.3s' }}>
                  {isChangingPassword ? '⏳ Menyimpan...' : '💾 Simpan Password Baru'}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ========================================== */}
      {/* MODAL EDITOR POSTINGAN */}
      {/* ========================================== */}
      {isModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(17, 28, 68, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '35px', borderRadius: '20px', width: '100%', maxWidth: '700px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 40px rgba(0,0,0,0.2)' }}>
            
            <h3 style={{ marginTop: 0, borderBottom: '2px solid #f4f7fe', paddingBottom: '15px', color: '#2b3674' }}>⚙️ Panel Pengaturan Postingan</h3>
            
            {selectedPost?.status === 'REJECTED' && selectedPost?.reject_reason && (
               <div style={{ backgroundColor: '#fff5f5', padding: '15px', borderRadius: '10px', marginBottom: '20px', color: '#c53030', border: '1px solid #feb2b2' }}>
                 <strong>⚠️ Catatan Revisi dari Approver:</strong><br/>
                 {selectedPost.reject_reason}
               </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#a0aec0' }}>FORMAT KONTEN</label>
                <select value={contentType} onChange={(e) => setContentType(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#2b3674', fontWeight: '500' }}>
                  <option value="CAROUSEL">📸 Foto / Carousel</option>
                  <option value="REELS">🎬 Video Reels</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#a0aec0' }}>JADWAL TAYANG</label>
                <input type="datetime-local" value={scheduledTime} onChange={(e) => setScheduledTime(e.target.value)} style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', color: '#2b3674', fontWeight: '500' }} />
              </div>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px', color: '#a0aec0' }}>CAPTION INSTAGRAM</label>
              <textarea rows={10} value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Tulis caption panjang di sini..." style={{ width: '100%', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', fontFamily: 'inherit', resize: 'vertical', fontSize: '14px', lineHeight: '1.6', color: '#2b3674' }} />
            </div>

            {isRejecting && canApproveOrReject && (
              <div style={{ backgroundColor: '#fffff0', padding: '20px', borderRadius: '10px', marginBottom: '20px', border: '1px solid #fefcbf' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#b7791f', fontSize: '13px' }}>ALASAN PENOLAKAN (REVISI):</label>
                <textarea rows={2} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Tulis catatan untuk Editor..." style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }} />
                <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
                  <button onClick={handleReject} style={{ padding: '10px 20px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Konfirmasi Tolak</button>
                  <button onClick={() => setIsRejecting(false)} style={{ padding: '10px 20px', backgroundColor: '#cbd5e1', color: '#2b3674', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Batal</button>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '15px', borderTop: '2px solid #f4f7fe', paddingTop: '20px' }}>
              <button onClick={() => setIsModalOpen(false)} style={{ padding: '12px 20px', backgroundColor: 'transparent', color: '#718096', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>Tutup</button>
              
              {canSubmit && (
                <button onClick={handleSubmitToApprover} style={{ padding: '12px 20px', backgroundColor: '#4318ff', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
                  📤 Kirim ke Approver
                </button>
              )}

              {canApproveOrReject && (
                <>
                  {!isRejecting && <button onClick={() => setIsRejecting(true)} style={{ padding: '12px 20px', backgroundColor: '#e53e3e', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>❌ Tolak (Revisi)</button>}
                  <button onClick={handleApprove} style={{ padding: '12px 20px', backgroundColor: '#48bb78', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✅ Setujui & Jadwalkan</button>
                </>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}