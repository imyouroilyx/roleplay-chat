import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const roomsMeta = await redis.hgetall("rooms_metadata");
    
    // ถ้าไม่มีห้องเลย ให้ห้องเริ่มต้นคือ D-VEN Night Club
    if (!roomsMeta || Object.keys(roomsMeta).length === 0) {
      return NextResponse.json([{ name: "D-VEN Night Club", type: "public" }]);
    }
    
    const rooms = Object.entries(roomsMeta).map(([name, meta]: [string, any]) => {
      try {
        const parsed = typeof meta === 'string' ? JSON.parse(meta) : meta;
        return { name, type: parsed.type || 'public' };
      } catch {
        return { name, type: 'public' };
      }
    });
    
    return NextResponse.json(rooms);
  } catch (error) {
    return NextResponse.json([{ name: "D-VEN Night Club", type: "public" }]);
  }
}