import { pusherServer } from "@/lib/pusher";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const { roomId, ...messageData } = body;

  // 1. บันทึกข้อความลง Redis (เก็บประวัติ)
  await redis.rpush(`messages:${roomId}`, JSON.stringify(body));
  
  // 2. ตั้งค่า Timeout (ลบประวัติถ้าไม่มีข้อความใหม่ใน 24 ชั่วโมง)
  await redis.expire(`messages:${roomId}`, 86400);

  // 3. ยิง Pusher ให้คนอื่นเห็นทันที
  await pusherServer.trigger(`presence-${roomId}`, "new-message", body);
  
  return NextResponse.json({ success: true });
}