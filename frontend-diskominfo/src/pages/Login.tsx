import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // State UX Tambahan
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState(''); // Untuk pesan error yang lebih elegan dari sekadar alert()
  
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); 
    setIsLoading(true);
    setErrorMessage(''); // Reset error setiap kali coba login
    
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/login`, {
        email: email,
        password: password,
      });

      const token = response.data.access_token || response.data.data?.access_token; 
      localStorage.setItem('jwt_token', token);
      
      // Transisi mulus ke dashboard
      navigate('/dashboard');

    } catch (error: any) {
      console.error(error);
      setErrorMessage(error.response?.data?.message || 'Gagal terhubung ke server.');
    } finally {
      setIsLoading(false); // Matikan loading baik saat sukses maupun gagal
    }
  };

  return (
    // Background Layar Penuh yang Elegan
    <div style={{ minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#f1f5f9', fontFamily: "'Inter', 'Segoe UI', sans-serif" }}>
      
      {/* Card Login Modern */}
      <div style={{ backgroundColor: '#ffffff', padding: '40px', borderRadius: '24px', width: '100%', maxWidth: '420px', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', boxSizing: 'border-box' }}>
        
        {/* Header Logo/Judul */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          
          {/* 👇 INI KODE UNTUK MENAMPILKAN LOGO 👇 */}
          <img 
            src="/logo-diskominfo-medan.gif" 
            alt="Logo Pemko Medan" 
            style={{ 
              width: '80px',       // Silakan ubah angka ini jika logo terlalu besar/kecil
              height: 'auto', 
              marginBottom: '16px',
              objectFit: 'contain' 
            }} 
          />
          
          <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '24px', fontWeight: 'bold' }}>Diskominfo Kota Medan</h2>
          <p style={{ margin: 0, color: '#64748b', fontSize: '14px', lineHeight: '1.5' }}>Sistem Otomatisasi & Penjadwalan Konten Instagram</p>
        </div>

        {/* Pesan Error (Muncul kalau gagal login) */}
        {errorMessage && (
          <div style={{ backgroundColor: '#fef2f2', color: '#dc2626', padding: '12px', borderRadius: '8px', fontSize: '13px', marginBottom: '20px', border: '1px solid #fecaca', textAlign: 'center' }}>
            ⚠️ {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Input Email */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Alamat Email</label>
            <input 
              type="email" 
              placeholder="example@diskominfo.go.id"
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              style={{ width: '100%', padding: '14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
            />
          </div>

          {/* Input Password */}
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '13px', fontWeight: '600', color: '#334155' }}>Kata Sandi</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Masukkan kata sandi Anda"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                style={{ width: '100%', padding: '14px 48px 14px 16px', borderRadius: '12px', border: '1px solid #cbd5e1', backgroundColor: '#f8fafc', fontSize: '14px', color: '#0f172a', boxSizing: 'border-box', outline: 'none', transition: 'all 0.2s' }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.boxShadow = 'none'; }}
              />
              {/* Tombol Mata (Show/Hide) */}
              <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ 
                    position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', 
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', 
                    padding: '6px', borderRadius: '8px', transition: '0.2s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' // Memastikan ikon presisi di tengah
                  }}
                  title={showPassword ? "Sembunyikan sandi" : "Tampilkan sandi"}
                  onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
                  onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#64748b'; }}
                >
                  {showPassword ? (
                    // Ikon Mata Tercoret (Sembunyikan Sandi)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width="20" height="20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                    </svg>
                  ) : (
                    // Ikon Mata Terbuka (Tampilkan Sandi)
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width="20" height="20">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </button>
            </div>
          </div>

          {/* Tombol Login */}
          <button 
            type="submit" 
            disabled={isLoading}
            style={{ 
              marginTop: '8px', width: '100%', padding: '14px', 
              backgroundColor: isLoading ? '#93c5fd' : '#2563eb', 
              color: 'white', border: 'none', borderRadius: '12px', 
              cursor: isLoading ? 'wait' : 'pointer', fontSize: '15px', fontWeight: 'bold', 
              transition: 'all 0.2s', boxShadow: isLoading ? 'none' : '0 4px 12px rgba(37, 99, 235, 0.2)'
            }}
            onMouseOver={(e) => { if(!isLoading) e.currentTarget.style.backgroundColor = '#1d4ed8'; }}
            onMouseOut={(e) => { if(!isLoading) e.currentTarget.style.backgroundColor = '#2563eb'; }}
          >
            {isLoading ? 'Memproses...' : 'Masuk ke Sistem'}
          </button>

        </form>
        
        {/* Footer Text */}
        <div style={{ textAlign: 'center', marginTop: '32px', borderTop: '1px solid #e2e8f0', paddingTop: '16px' }}>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: '12px' }}>&copy; 2026 Pemerintahan Daerah. Hak Cipta Dilindungi.</p>
        </div>

      </div>
    </div>
  );
}