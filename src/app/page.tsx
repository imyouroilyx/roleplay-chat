"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Lobby() {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#ffffff');
  const [rooms, setRooms] = useState<{name: string, type: string}[]>([]);
  const [selectedRoom, setSelectedRoom] = useState('D-VEN Night Club');
  const [roomPassword, setRoomPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const router = useRouter();

  useEffect(() => {
    setName(localStorage.getItem('rp_name') || '');
    setColor(localStorage.getItem('rp_color') || '#ffffff');
    setAdminPassword(localStorage.getItem('rp_admin_key') || '');
    
    fetch('/api/rooms').then(res => res.json()).then(data => {
      setRooms(data);
      if (data.length > 0) setSelectedRoom(data[0].name);
    });
  }, []);

  const handleEnter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("กรุณาระบุตัวตนก่อนเข้าใช้งาน !");

    const currentRoomData = rooms.find(r => r.name === selectedRoom);
    
    if (currentRoomData?.type === 'private') {
      const res = await fetch('/api/rooms/verify', {
        method: 'POST',
        body: JSON.stringify({ roomName: selectedRoom, password: roomPassword })
      });
      if (!res.ok) return alert("รหัสผ่านห้องส่วนตัวไม่ถูกต้อง!");
    }
    
    localStorage.setItem('rp_name', name);
    localStorage.setItem('rp_color', color);
    localStorage.setItem('rp_admin_key', adminPassword);
    
    router.push(`/chat/${selectedRoom}`);
  };

  const isPrivate = rooms.find(r => r.name === selectedRoom)?.type === 'private';

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 font-sans">
      <div className="flex flex-col items-center mb-10 animate-in fade-in zoom-in duration-700 text-center">
        <a href="https://roleplayth.com/index.php" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
          <img src="https://iili.io/qQNVmS1.png" alt="D-VEN HOST CLUB Logo" className="w-24 h-24 mb-4" />
        </a>
        <h1 className="text-4xl font-black tracking-[0.2em] uppercase text-blue-500 drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]">
          D-VEN HOST CLUB
        </h1>
        <p className="text-[10px] text-neutral-500 mt-2 tracking-[0.5em] uppercase">Connect to the system</p>
      </div>

      <form onSubmit={handleEnter} className="w-full max-w-md space-y-6">
        <div className="space-y-2">
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center block">นามแฝง (Nickname)</label>
          <input 
            type="text" value={name} onChange={(e) => setName(e.target.value)}
            className="w-full bg-transparent border-b-2 border-neutral-900 p-4 focus:border-white outline-none transition-all text-2xl font-bold text-center"
            placeholder="ระบุตัวตนของคุณ..."
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center block">เลือกห้อง</label>
          <select 
            value={selectedRoom} onChange={(e) => { setSelectedRoom(e.target.value); setRoomPassword(''); }}
            className="w-full bg-black border border-neutral-800 p-4 outline-none text-lg font-bold cursor-pointer rounded-lg text-center appearance-none"
          >
            {rooms.map(r => (
              <option key={r.name} value={r.name}>
                {r.name} {r.type === 'private' ? '🔒 (ส่วนตัว)' : '🌐 (สาธารณะ)'}
              </option>
            ))}
          </select>
        </div>

        {isPrivate && (
          <div className="space-y-2 animate-in slide-in-from-top-2 fade-in">
            <label className="text-[10px] text-red-500 font-bold uppercase tracking-widest text-center block">รหัสผ่านสำหรับห้องส่วนตัว</label>
            <input 
              type="password" value={roomPassword} onChange={(e) => setRoomPassword(e.target.value)}
              className="w-full bg-neutral-950 border border-red-900/50 p-4 focus:border-red-500 outline-none transition-all text-lg text-center rounded-lg"
              placeholder="กรอกรหัสผ่านห้อง..."
            />
          </div>
        )}

        <div className="space-y-2 pt-4">
          <label className="text-[10px] text-neutral-500 font-bold uppercase tracking-widest text-center block">สีข้อความประจำตัว</label>
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="w-full h-14 bg-transparent border border-neutral-800 p-1 cursor-pointer rounded-lg" />
        </div>

        <div className="space-y-2 pt-4">
          <label className="text-[10px] text-neutral-600 font-bold uppercase tracking-widest text-center block">รหัสผ่านแอดมิน (หากมี)</label>
          <input 
            type="password" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
            className="w-full bg-transparent border border-neutral-900 p-4 focus:border-blue-500 outline-none transition-all text-sm text-center rounded-lg text-neutral-400"
            placeholder="Admin Access Key"
          />
        </div>

        <button className="w-full bg-white text-black p-6 font-black uppercase text-xl hover:bg-blue-600 hover:text-white transition-all shadow-2xl rounded-xl mt-4">
          เข้าสู่ระบบ
        </button>
      </form>
    </main>
  );
}