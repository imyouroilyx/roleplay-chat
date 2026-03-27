import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const rooms = await redis.hgetall("rooms_metadata");
    // ตรวจสอบว่าถ้าไม่มีข้อมูลเลย ให้ส่ง Object ว่างกลับไป
    return NextResponse.json(rooms || {});
  } catch (error) {
    return NextResponse.json({});
  }
}

export async function POST(req: Request) {
  try {
    const { action, roomName, type, roomPassword, adminPassword } = await req.json();

    if (adminPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "รหัสผ่านแอดมินไม่ถูกต้อง" }, { status: 401 });
    }

    if (!roomName) return NextResponse.json({ error: "กรุณาระบุชื่อห้อง" }, { status: 400 });

    if (action === "save") {
      // บันทึกข้อมูลเป็น JSON String ให้ชัดเจน
      const roomData = JSON.stringify({ 
        type: type || 'public', 
        roomPassword: roomPassword || '' 
      });
      
      await redis.hset("rooms_metadata", { [roomName]: roomData });
      await redis.sadd("public_rooms_list", roomName);
      
    } else if (action === "delete") {
      await redis.hdel("rooms_metadata", roomName);
      await redis.srem("public_rooms_list", roomName);
      await redis.del(`messages:${roomName}`);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}