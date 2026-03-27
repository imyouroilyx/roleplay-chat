"use client";

import { useState, useEffect, useRef, use } from 'react';
import PusherClient from 'pusher-js';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import EmojiPicker, { Theme } from 'emoji-picker-react';

// เพิ่ม ip เข้าไปใน interface
export interface MemberData {
  id: string;
  name: string;
  isAdmin: boolean;
  ip?: string;
}

export default function ChatPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const router = useRouter();
  
  const safeRoomId = encodeURIComponent(roomId).replace(/%/g, '_');

  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [nickname, setNickname] = useState('');
  const [textColor, setTextColor] = useState('#ffffff');
  const [members, setMembers] = useState<MemberData[]>([]);
  const [recipient, setRecipient] = useState<string>('all');
  const [isAdmin, setIsAdmin] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isChangingName, setIsChangingName] = useState(false);
  const [newName, setNewName] = useState('');
  const [openUserMenu, setOpenUserMenu] = useState(false);
  
  const [roomList, setRoomList] = useState<Record<string, any>>({});
  const [newRoom, setNewRoom] = useState({ name: '', type: 'public', pass: '' });
  const [bannedIps, setBannedIps] = useState<string[]>([]);

  const [allRooms, setAllRooms] = useState<{name: string, type: string}[]>([]);
  const [showSwitchRoom, setShowSwitchRoom] = useState(false);
  const [switchTargetRoom, setSwitchTargetRoom] = useState<{name: string, type: string} | null>(null);
  const [switchPass, setSwitchPass] = useState('');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const joinAudio = useRef<HTMLAudioElement | null>(null);
  const msgAudio = useRef<HTMLAudioElement | null>(null);

  // แจ้งเตือนกระพริบแท็บ
  const [isWindowFocused, setIsWindowFocused] = useState(true);
  const flashInterval = useRef<NodeJS.Timeout | null>(null);
  const originalTitle = useRef("D-VEN HOST CLUB");

  const sizeMap: Record<string, string> = {
    "1": "12px", "2": "16px", "3": "18px", "4": "22px", "5": "28px", "6": "36px", "7": "48px"
  };

  useEffect(() => {
    const onFocus = () => {
      setIsWindowFocused(true);
      if (flashInterval.current) {
        clearInterval(flashInterval.current);
        flashInterval.current = null;
      }
      document.title = originalTitle.current;
    };
    const onBlur = () => setIsWindowFocused(false);

    window.addEventListener('focus', onFocus);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  const applyBBCode = (open: string, close: string) => {
    const el = inputRef.current;
    if (!el) return;
    const start = el.selectionStart || 0;
    const end = el.selectionEnd || 0;
    const selected = input.substring(start, end);
    const val = input.substring(0, start) + open + selected + close + input.substring(end);
    setInput(val);
    setTimeout(() => {
      el.focus();
      const pos = selected ? start + open.length + selected.length + close.length : start + open.length;
      el.setSelectionRange(pos, pos);
    }, 10);
  };

  const parseBBCode = (text: string) => {
    return text
      .replace(/\[b\](.*?)\[\/b\]/g, '<strong>$1</strong>')
      .replace(/\[i\](.*?)\[\/i\]/g, '<em>$1</em>')
      .replace(/\[u\](.*?)\[\/u\]/g, '<u style="text-decoration: underline">$1</u>')
      .replace(/\[s\](.*?)\[\/s\]/g, '<del>$1</del>')
      .replace(/\[size=([1-7])\](.*?)\[\/size\]/g, (_, p1, p2) => `<span style="font-size: ${sizeMap[p1]}">${p2}</span>`)
      .replace(/\[img\](.*?)\[\/img\]/g, '<img src="$1" class="max-w-xs my-1 block rounded border border-neutral-800" />');
  };

  useEffect(() => {
    const savedName = localStorage.getItem('rp_name') || 'นิรนาม';
    const savedColor = localStorage.getItem('rp_color') || '#ffffff';
    const adminKey = localStorage.getItem('rp_admin_key') || "";
    
    setNickname(savedName);
    setNewName(savedName);
    setTextColor(savedColor);

    joinAudio.current = new Audio('/sounds/Join.wav');
    msgAudio.current = new Audio('/sounds/message.wav');
    
    const localHistory = sessionStorage.getItem(`chat_log_${safeRoomId}`);
    if (localHistory) setMessages(JSON.parse(localHistory));

    const pusher = new PusherClient(process.env.NEXT_PUBLIC_PUSHER_KEY!, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER!,
      authEndpoint: '/api/pusher/auth',
      auth: { params: { nickname: savedName, password: adminKey } }
    });

    const channel = pusher.subscribe(`presence-${safeRoomId}`);

    channel.bind('pusher:subscription_succeeded', (m: any) => {
      joinAudio.current?.play().catch(() => {});
      const list: MemberData[] = [];
      m.each((member: any) => {
        list.push({ id: member.id, name: member.info.name, isAdmin: member.info.isAdmin, ip: member.info.ip });
        if (member.info.name === savedName && member.info.isAdmin) setIsAdmin(true);
      });
      setMembers(list);
    });

    channel.bind('pusher:member_added', (member: any) => {
      joinAudio.current?.play().catch(() => {});
      setMessages(prev => [...prev, { type: 'system', text: `>>> ${member.info.name} เข้าสู่ระบบแล้ว` }]);
      setMembers(prev => [...prev, { id: member.id, name: member.info.name, isAdmin: member.info.isAdmin, ip: member.info.ip }]);
    });

    channel.bind('pusher:member_removed', (member: any) => {
      setMessages(prev => [...prev, { type: 'system', text: `<<< ${member.info.name} ออกจากระบบแล้ว (session: timeout)` }]);
      setMembers(prev => prev.filter(n => n.id !== member.id));
    });

    channel.bind('new-message', (data: any) => {
      setMessages(prev => [...prev, data]);
      if (data.isNameChange) {
        setMembers(prev => prev.map(m => m.name === data.oldName ? { ...m, name: data.newName } : m));
      }

      // เล่นเสียงและกะพริบแท็บเมื่อมีข้อความจากคนอื่น
      if (data.sender !== savedName && data.type !== 'system') {
        msgAudio.current?.play().catch(() => {});
        if (!isWindowFocused) {
          if (!flashInterval.current) {
            let toggle = false;
            flashInterval.current = setInterval(() => {
              document.title = toggle ? "💬 มีข้อความใหม่เข้ามา!" : originalTitle.current;
              toggle = !toggle;
            }, 1000);
          }
        }
      }
    });

    channel.bind('delete-message', (data: { msgId: string }) => {
      setMessages(prev => prev.filter(m => m.msgId !== data.msgId));
    });

    // ดักจับการเตะและแบน
    channel.bind('kick-user', (data: { targetName: string, isBan?: boolean }) => {
      if (data.targetName === savedName) {
        alert(data.isBan ? "คุณถูกแบน IP จากระบบ!" : "คุณถูกแอดมินเตะออกจากห้อง!");
        sessionStorage.removeItem(`chat_log_${safeRoomId}`);
        window.location.href = '/';
      }
    });

    return () => { pusher.disconnect(); };
  }, [roomId, safeRoomId, isWindowFocused]);

  useEffect(() => {
    if (messages.length > 0) {
      sessionStorage.setItem(`chat_log_${safeRoomId}`, JSON.stringify(messages));
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });

      const container = document.getElementById('chat-container');
      if (container) {
        const imgs = container.getElementsByTagName('img');
        for (let i = 0; i < imgs.length; i++) {
          imgs[i].onload = () => scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [messages, safeRoomId]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const currentInput = input;
    setInput('');
    setShowEmoji(false);

    const msgId = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    await fetch('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        msgId, text: currentInput, sender: nickname, color: textColor,
        type: recipient === 'all' ? 'public' : 'whisper',
        recipient: recipient === 'all' ? null : recipient,
        roomId: safeRoomId, isAdmin,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
      })
    });
  };

  const deleteMessage = async (msgId: string) => {
    if (!confirm("ลบข้อความนี้ใช่หรือไม่?")) return;
    await fetch('/api/chat/delete', {
      method: 'POST',
      body: JSON.stringify({ roomId: safeRoomId, msgId, adminPassword: localStorage.getItem('rp_admin_key') })
    });
  };

  const handleChangeName = async () => {
    if (!newName.trim() || newName === nickname) { setIsChangingName(false); return; }
    const oldName = nickname;
    localStorage.setItem('rp_name', newName);
    setNickname(newName);
    setIsChangingName(false);
    setOpenUserMenu(false);

    await fetch('/api/chat/send', {
      method: 'POST',
      body: JSON.stringify({
        type: 'system',
        text: `>>> 🔄 ${oldName} เปลี่ยนชื่อดิสเพลย์เป็น ${newName}`,
        roomId: safeRoomId,
        timestamp: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
        isNameChange: true, oldName, newName
      })
    });
  };

  // แอดมิน: เตะคน
  const handleKick = async (targetName: string) => {
    if (!confirm(`ต้องการเตะ ${targetName} ออกจากห้อง?`)) return;
    await fetch('/api/admin/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'kick', roomId: safeRoomId, targetName, adminPassword: localStorage.getItem('rp_admin_key') })
    });
  };

  // แอดมิน: แบน IP
  const handleBan = async (targetName: string, targetIp: string) => {
    if (!confirm(`ต้องการแบน IP ของ ${targetName} ถาวร?`)) return;
    await fetch('/api/admin/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'ban', roomId: safeRoomId, targetName, targetIp, adminPassword: localStorage.getItem('rp_admin_key') })
    });
  };

  const fetchAdminData = async () => {
    try {
      const res = await fetch('/api/admin/rooms');
      setRoomList((await res.json()) || {});
      const resBan = await fetch('/api/admin/actions', {
        method: 'POST', body: JSON.stringify({ action: 'get_bans', adminPassword: localStorage.getItem('rp_admin_key') })
      });
      const banData = await resBan.json();
      setBannedIps(banData.bans || []);
    } catch (e) { console.error(e); }
  };

  const saveRoom = async () => {
    if (!newRoom.name.trim()) return alert('กรุณาระบุชื่อห้อง');
    await fetch('/api/admin/rooms', {
      method: 'POST',
      body: JSON.stringify({ action: 'save', roomName: newRoom.name, type: newRoom.type, roomPassword: newRoom.pass, adminPassword: localStorage.getItem('rp_admin_key') })
    });
    alert('บันทึกห้องเรียบร้อย');
    fetchAdminData();
  };

  const unbanIp = async (ip: string) => {
    if(!confirm('ต้องการปลดแบน IP นี้?')) return;
    await fetch('/api/admin/actions', {
      method: 'POST',
      body: JSON.stringify({ action: 'unban', targetIp: ip, adminPassword: localStorage.getItem('rp_admin_key') })
    });
    fetchAdminData();
  };

  const openSwitchRoomModal = async () => {
    try {
      const res = await fetch('/api/rooms');
      setAllRooms(await res.json());
      setShowSwitchRoom(true);
    } catch (e) { console.error(e); }
  };

  const handleSwitchRoom = async () => {
    if (!switchTargetRoom) return alert("กรุณาเลือกห้องก่อน!");
    if (switchTargetRoom.type === 'private') {
      const res = await fetch('/api/rooms/verify', { method: 'POST', body: JSON.stringify({ roomName: switchTargetRoom.name, password: switchPass }) });
      if (!res.ok) return alert("รหัสผ่านห้องส่วนตัวไม่ถูกต้อง!");
    }
    sessionStorage.removeItem(`chat_log_${safeRoomId}`);
    setShowSwitchRoom(false); setSwitchTargetRoom(null); setSwitchPass('');
    router.push(`/chat/${switchTargetRoom.name}`);
  };

  return (
    <div className="flex h-screen bg-black text-white flex-col md:flex-row font-sans overflow-hidden">
      
      <aside className="w-full md:w-80 border-r border-neutral-900 flex flex-col px-6 py-4 bg-[#020202] z-10">
        <div className="flex items-center gap-3 mb-4">
          <a href="https://roleplayth.com/index.php" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform cursor-pointer z-50">
            <img src="https://iili.io/qQNVmS1.png" className="w-10 h-10" alt="Logo" />
          </a>
          <h2 className="text-sm font-black tracking-widest text-neutral-400 uppercase">รายชื่อออนไลน์</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 custom-scrollbar">
          <AnimatePresence>
            {[...members].sort((a,b) => (a.name === nickname ? -1 : b.name === nickname ? 1 : a.isAdmin && !b.isAdmin ? -1 : 1)).map((m) => {
              const isMe = m.name === nickname;
              return (
                <motion.div layout key={m.id} className="text-xl py-1 flex flex-col">
                  {isMe ? (
                    <>
                      <span onClick={() => setOpenUserMenu(!openUserMenu)} className={`font-black cursor-pointer transition-all ${m.isAdmin ? "bg-gradient-to-r from-blue-400 via-white to-blue-500 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent" : "text-white underline decoration-neutral-800"}`} style={m.isAdmin ? { filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.95))' } : {}}>
                        ● {m.name} {openUserMenu ? '▴' : '▾'}
                      </span>
                      <AnimatePresence>
                        {openUserMenu && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden pl-4 mt-2">
                            <button onClick={() => setIsChangingName(true)} className="text-[10px] bg-neutral-900 text-neutral-400 hover:text-white px-3 py-2 rounded uppercase border border-neutral-800 transition-all w-fit">แก้ไขชื่อดิสเพลย์</button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </>
                  ) : (
                    <div className="flex flex-col">
                      <span onClick={() => setRecipient(m.name)} className={`font-black cursor-pointer transition-all ${m.isAdmin ? "bg-gradient-to-r from-blue-400 via-white to-blue-500 bg-[length:200%_auto] animate-gradient-x bg-clip-text text-transparent" : "text-neutral-600 hover:text-neutral-400"}`} style={m.isAdmin ? { filter: 'drop-shadow(0 0 12px rgba(59, 130, 246, 0.95))' } : {}}>
                        ○ {m.name}
                      </span>
                      {isAdmin && (
                        <div className="flex gap-3 pl-6 mt-1 opacity-50 hover:opacity-100 transition-opacity">
                          <button onClick={() => handleKick(m.name)} className="text-[10px] text-yellow-500 hover:underline">เตะ</button>
                          {m.ip && <button onClick={() => handleBan(m.name, m.ip!)} className="text-[10px] text-red-500 hover:underline">แบน IP</button>}
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        <div className="space-y-2">
          <button onClick={openSwitchRoomModal} className="w-full bg-neutral-900/50 border border-neutral-800 p-3 font-bold text-[10px] uppercase rounded-lg hover:bg-neutral-800 transition-all text-neutral-300">ย้ายห้อง (Switch Room)</button>
          {isAdmin && (
            <button onClick={() => { setShowAdminPanel(true); fetchAdminData(); }} className="w-full bg-blue-600/20 text-blue-400 border border-blue-500/50 p-3 font-black text-[10px] rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.3)] hover:bg-blue-600 hover:text-white transition-all uppercase">Admin Tools</button>
          )}
          <button onClick={() => { sessionStorage.removeItem(`chat_log_${safeRoomId}`); router.push('/'); }} className="w-full border border-neutral-800 p-3 font-black text-[10px] hover:bg-red-600 hover:border-red-600 transition-all rounded-lg uppercase">ออกจากระบบ</button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative bg-[#050505]">
        <header className="px-6 py-4 border-b border-neutral-900 flex justify-between items-center text-sm font-bold text-neutral-600 uppercase tracking-widest">
          <span className="text-blue-500 text-base drop-shadow-[0_0_8px_rgba(59,130,246,0.6)]">D-VEN HOST CLUB</span>
          <span className="text-white">ห้อง: {decodeURIComponent(roomId)}</span>
        </header>

        <div id="chat-container" className="flex-1 overflow-y-auto p-10 space-y-2 custom-scrollbar">
          {messages.map((msg, idx) => {
            if (msg.type === 'system') return <div key={idx} className="text-neutral-700 text-xs italic py-2 tracking-wide">{msg.text}</div>;
            if (msg.type === 'whisper' && msg.sender !== nickname && msg.recipient !== nickname) return null;

            return (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.05 }} key={msg.msgId || idx} className="flex items-baseline gap-3 text-lg md:text-xl leading-snug">
                <span className="text-neutral-900 text-[10px] font-mono">[{msg.timestamp}]</span>
                <span className={`font-black whitespace-nowrap ${msg.isAdmin ? "bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent" : "text-neutral-600"}`} style={msg.isAdmin ? { filter: 'drop-shadow(0 0 5px rgba(34, 211, 238, 0.4))' } : {}}>
                  {msg.sender}:
                </span>
                <span className="font-medium" style={{ color: msg.color }} dangerouslySetInnerHTML={{ __html: parseBBCode(msg.text) }} />
                {msg.type === 'whisper' && <span className="text-[9px] bg-red-600 text-white px-2 rounded font-black self-center ml-2">PRIVATE</span>}
                {isAdmin && (
                  <button onClick={() => deleteMessage(msg.msgId)} className="text-red-600 hover:text-red-400 text-[10px] font-bold ml-2 self-center opacity-50 hover:opacity-100 transition-opacity">[X]</button>
                )}
              </motion.div>
            );
          })}
          <div ref={scrollRef} />
        </div>

        {/* Modal: ย้ายห้อง */}
        <AnimatePresence>
          {showSwitchRoom && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-[80] flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-2xl w-full max-w-sm space-y-4 shadow-2xl">
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-blue-500 text-center mb-4">เลือกห้องที่ต้องการย้าย</h3>
                <div className="space-y-2 max-h-56 overflow-y-auto custom-scrollbar">
                  {allRooms.map(r => (
                    <div key={r.name} onClick={() => { setSwitchTargetRoom(r); setSwitchPass(''); }} className={`p-3 border rounded-lg cursor-pointer transition-all ${switchTargetRoom?.name === r.name ? 'border-blue-500 bg-blue-900/20' : 'border-neutral-800 bg-neutral-900/30 hover:bg-neutral-800'}`}>
                      <p className="font-bold text-white text-sm">{r.name}</p>
                      <p className="text-[10px] text-neutral-500 uppercase mt-1">{r.type === 'private' ? '🔒 ส่วนตัว' : '🌐 สาธารณะ'}</p>
                    </div>
                  ))}
                </div>
                <AnimatePresence>
                  {switchTargetRoom?.type === 'private' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <input type="password" placeholder="รหัสผ่านห้องส่วนตัว..." value={switchPass} onChange={(e) => setSwitchPass(e.target.value)} className="w-full bg-black border border-red-900/50 p-3 mt-2 text-sm outline-none focus:border-red-500 transition-all rounded text-white text-center" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="flex gap-2 pt-2">
                  <button onClick={handleSwitchRoom} className="flex-1 bg-white text-black p-3 font-bold text-xs rounded uppercase hover:bg-neutral-300 transition-all">ย้ายห้อง</button>
                  <button onClick={() => { setShowSwitchRoom(false); setSwitchTargetRoom(null); setSwitchPass(''); }} className="flex-1 border border-neutral-800 p-3 font-bold text-xs rounded text-neutral-500 uppercase hover:text-white transition-all">ยกเลิก</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: Admin Panel */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/95 z-50 flex items-center justify-center p-6 backdrop-blur-md">
              <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-3xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
                <h3 className="text-sm font-black text-blue-500 tracking-[0.4em] uppercase mb-6 text-center">จัดการระบบ (Admin Tools)</h3>
                
                <div className="flex flex-col lg:flex-row gap-8 flex-1 overflow-hidden">
                  <div className="flex-1 space-y-4">
                    <h4 className="text-[10px] text-neutral-500 font-bold uppercase underline">เพิ่ม/แก้ไขห้อง</h4>
                    <input placeholder="ชื่อห้อง" value={newRoom.name} onChange={e=>setNewRoom({...newRoom, name: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 text-xs rounded outline-none focus:border-blue-500 text-white" />
                    <select value={newRoom.type} onChange={e=>setNewRoom({...newRoom, type: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 text-xs rounded outline-none text-white">
                      <option value="public">สาธารณะ (Public)</option>
                      <option value="private">ส่วนตัว (Private)</option>
                    </select>
                    {newRoom.type === 'private' && <input placeholder="รหัสผ่านห้อง" value={newRoom.pass} onChange={e=>setNewRoom({...newRoom, pass: e.target.value})} className="w-full bg-black border border-neutral-800 p-3 text-xs rounded outline-none focus:border-blue-500 text-white" />}
                    <button onClick={saveRoom} className="w-full bg-blue-600 p-3 font-bold text-[10px] rounded uppercase hover:bg-blue-500 transition-all text-white">บันทึกข้อมูล</button>
                    
                    <div className="pt-4 border-t border-neutral-900 mt-4">
                      <h4 className="text-[10px] text-red-500 font-bold uppercase underline mb-4">รายการ IP ที่ถูกแบน</h4>
                      <div className="max-h-32 overflow-y-auto space-y-2 custom-scrollbar">
                        {bannedIps.length === 0 ? <p className="text-xs text-neutral-600 italic">ไม่มีข้อมูลการแบน</p> : bannedIps.map((ip) => (
                          <div key={ip} className="flex justify-between items-center bg-red-950/30 border border-red-900/50 p-2 rounded">
                            <span className="text-xs font-mono text-red-400">{ip}</span>
                            <button onClick={() => unbanIp(ip)} className="text-[10px] bg-neutral-900 px-2 py-1 rounded hover:bg-white hover:text-black">ปลดแบน</button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col">
                    <h4 className="text-[10px] text-neutral-500 font-bold uppercase underline mb-4">รายการห้องปัจจุบัน</h4>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar text-xs">
                      {Object.entries(roomList).map(([name, meta]: [string, any]) => {
                        let m; try { m = typeof meta === 'string' ? JSON.parse(meta) : meta; } catch (e) { m = { type: 'public', roomPassword: '' }; }
                        return (
                          <div key={name} className="flex items-center justify-between p-3 border border-neutral-900 rounded bg-neutral-900/30">
                            <div>
                              <p className="font-bold text-white text-[11px]">{name}</p>
                              <p className="text-[9px] text-neutral-500 uppercase">{m.type} {m.type === 'private' && `[Pass: ${m.roomPassword}]`}</p>
                            </div>
                            <div className="flex gap-3">
                              <button onClick={() => setNewRoom({ name, type: m.type, pass: m.roomPassword })} className="text-blue-500 font-bold text-[10px] hover:underline">แก้ไข</button>
                              <button onClick={async () => { if(confirm(`ลบห้อง ${name}?`)) { await fetch('/api/admin/rooms', {method:'POST', body: JSON.stringify({action:'delete', roomName:name, adminPassword:localStorage.getItem('rp_admin_key')})}); fetchAdminData(); } }} className="text-red-500 font-bold text-[10px] hover:underline">ลบ</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <button onClick={() => setShowAdminPanel(false)} className="text-neutral-700 text-[10px] font-bold uppercase underline mt-6 text-center hover:text-white transition-all">ปิดหน้าต่าง</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Modal: เปลี่ยนชื่อดิสเพลย์ */}
        <AnimatePresence>
          {isChangingName && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/90 z-[70] flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-neutral-950 border border-neutral-900 p-8 rounded-2xl w-full max-w-xs space-y-4 shadow-2xl text-center">
                <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-neutral-500">เปลี่ยนชื่อดิสเพลย์</h3>
                <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full bg-black border border-neutral-800 p-3 text-xl text-center outline-none focus:border-white transition-all rounded text-white" />
                <div className="flex gap-2">
                  <button onClick={handleChangeName} className="flex-1 bg-white text-black p-3 font-bold text-xs rounded uppercase hover:bg-neutral-300 transition-all">บันทึก</button>
                  <button onClick={() => setIsChangingName(false)} className="flex-1 border border-neutral-800 p-3 font-bold text-xs rounded text-neutral-500 uppercase hover:text-white transition-all">ยกเลิก</button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="p-6 border-t border-neutral-900 bg-black relative">
          {showEmoji && (
            <div className="absolute bottom-28 left-6 z-50">
              <EmojiPicker theme={Theme.DARK} onEmojiClick={(e) => setInput(p => p + e.emoji)} width={300} height={400} />
            </div>
          )}
          <div className="max-w-5xl mx-auto space-y-4">
            <div className="flex gap-1 items-center flex-wrap">
              <div className="flex gap-1 bg-neutral-950 p-1 rounded-lg border border-neutral-900">
                <button onClick={() => applyBBCode('[b]', '[/b]')} className="p-2 font-bold px-3 text-sm hover:text-white transition-all">B</button>
                <button onClick={() => applyBBCode('[i]', '[/i]')} className="p-2 italic px-3 text-sm hover:text-white transition-all">I</button>
                <button onClick={() => applyBBCode('[u]', '[/u]')} className="p-2 underline px-3 text-sm hover:text-white transition-all">U</button>
                <button onClick={() => applyBBCode('[s]', '[/s]')} className="p-2 line-through px-3 text-sm hover:text-white transition-all">S</button>
                <select onChange={(e) => { if(e.target.value) applyBBCode(`[size=${e.target.value}]`, '[/size]'); e.target.value=''; }} className="bg-black text-[9px] font-bold p-1 outline-none uppercase text-white border-l border-neutral-800 ml-1 pl-2">
                  <option value="">SIZE</option>
                  {[1,2,3,4,5,6,7].map(v => <option key={v} value={v}>Lvl {v}</option>)}
                </select>
                <button onClick={() => applyBBCode('[img]', '[/img]')} className="p-2 text-[9px] px-3 font-bold uppercase hover:text-white transition-all border-l border-neutral-800 ml-1">Img</button>
                <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 text-lg hover:scale-110 transition-transform border-l border-neutral-800 ml-1 pl-3">😊</button>
              </div>
              
              <div className="flex items-center gap-2 ml-auto">
                {recipient !== 'all' && <button onClick={() => setRecipient('all')} className="bg-red-900/40 text-red-500 border border-red-900 px-3 py-1 rounded-full text-[9px] font-bold uppercase hover:bg-red-600 hover:text-white transition-all">ยกเลิกกระซิบ</button>}
                <input type="color" value={textColor} onChange={(e) => { setTextColor(e.target.value); localStorage.setItem('rp_color', e.target.value); }} className="w-8 h-8 bg-transparent cursor-pointer rounded-full" />
              </div>
            </div>
            
            <div className="flex gap-3 border-b border-neutral-800 focus-within:border-white transition-all">
              <input 
                ref={inputRef} type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={recipient === 'all' ? "ป้อนข้อความ..." : `กำลังกระซิบหา ${recipient}...`}
                className="flex-1 bg-transparent p-4 text-xl md:text-2xl outline-none placeholder:text-neutral-900" style={{ color: textColor }} 
              />
              <button onClick={handleSend} className="bg-white text-black px-10 py-3 font-black text-sm uppercase hover:invert transition-all rounded-lg shadow-lg">ส่ง</button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
