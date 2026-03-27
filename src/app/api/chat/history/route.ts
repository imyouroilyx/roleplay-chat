import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get("roomId");
  if (!roomId) return NextResponse.json([]);

  // ดึงข้อความ 100 ข้อความล่าสุดจาก Redis
  const messages = await redis.lrange(`messages:${roomId}`, 0, 100);
  return NextResponse.json(messages.map(m => typeof m === 'string' ? JSON.parse(m) : m));
}