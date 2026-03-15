import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); // Mencegah halaman reload saat tombol ditekan
    
    try {
      console.log('Mengetuk pintu backend NestJS...');
      
      // Menembak API Backend Anda!
      const response = await axios.post('${import.meta.env.VITE_API_URL}/auth/login', {
        email: email,
        password: password,
      });

      // Mengambil Token JWT dari balasan NestJS
      // (Sesuaikan "access_token" dengan nama yang dikirim oleh backend Anda)
      const token = response.data.access_token || response.data.data?.access_token; 
      
      // Simpan Token ke brankas browser
      localStorage.setItem('jwt_token', token);
      
      alert('✅ Login Berhasil! Selamat datang!');
      
      // Langsung pindahkan user ke halaman Dashboard
      navigate('/dashboard');

    } catch (error: any) {
      console.error(error);
      alert('❌ Login Gagal! ' + (error.response?.data?.message || 'Server mati?'));
    }
  };

  return (
    <div style={{ padding: '50px', fontFamily: 'sans-serif', maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login Diskominfo</h2>
      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        
        <div>
          <label>Email:</label><br/>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <div>
          <label>Password:</label><br/>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            required 
            style={{ width: '100%', padding: '8px' }}
          />
        </div>

        <button type="submit" style={{ padding: '10px', backgroundColor: '#007bff', color: 'white', border: 'none', cursor: 'pointer' }}>
          Masuk
        </button>

      </form>
    </div>
  );
}