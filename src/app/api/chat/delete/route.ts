import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { roomId, msgId, adminPassword } = await req.json();

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" }, { status: 401 });
    }

    // ยิงคำสั่งให้ทุกคนในห้องลบข้อความที่มี ID ตรงกันทิ้ง
    await pusherServer.trigger(`presence-${roomId}`, "delete-message", { msgId });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}