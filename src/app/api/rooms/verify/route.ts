import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { roomName, password } = await req.json();
    const meta = await redis.hget("rooms_metadata", roomName);
    
    // ถ้าไม่พบข้อมูลห้อง ให้ถือว่าเข้าได้ (อาจเป็นห้อง fallback)
    if (!meta) return NextResponse.json({ success: true });
    
    const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
    
    // ถ้าระบุว่าเป็น private และรหัสไม่ตรง ให้เด้งกลับ
    if (parsed.type === 'private' && parsed.roomPassword !== password) {
      return NextResponse.json({ error: "รหัสผ่านห้องไม่ถูกต้อง" }, { status: 401 });
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}