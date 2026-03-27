import { pusherServer } from "@/lib/pusher";
import { redis } from "@/lib/redis";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // ดึง IP ของผู้ใช้
  const ip = req.headers.get("x-forwarded-for") || "127.0.0.1";
  
  // เช็กว่า IP นี้โดนแบนหรือไม่
  const isBanned = await redis.sismember("banned_ips", ip);
  if (isBanned) {
    return NextResponse.json({ error: "Banned" }, { status: 403 });
  }

  const data = await req.text();
  const params = new URLSearchParams(data);
  const socketId = params.get("socket_id") as string;
  const channelName = params.get("channel_name") as string;
  const nickname = params.get("nickname") || "นิรนาม";
  const password = params.get("password") || "";

  const isAdmin = password === process.env.ADMIN_PASSWORD;

  const presenceData = {
    user_id: `user-${Math.random().toString(36).substring(2, 9)}`,
    user_info: { name: nickname, isAdmin, ip }, // ส่ง IP เข้าไปในวงแชตด้วย
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
  return NextResponse.json(authResponse);
}
