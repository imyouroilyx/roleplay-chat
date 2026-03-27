import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  
  for (const event of body.events) {
    if (event.name === 'channel_vacated') {
      const roomId = event.channel.replace('presence-', '');
      // สั่งลบแชตใน Redis ทันทีเมื่อคนออกหมด
      await redis.del(`messages:${roomId}`);
    }
  }
  return new Response("OK");
}