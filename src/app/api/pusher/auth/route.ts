import { pusherServer } from "@/lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const data = await req.text();
  const params = new URLSearchParams(data);
  const socketId = params.get("socket_id") as string;
  const channelName = params.get("channel_name") as string;
  const nickname = params.get("nickname") || "นิรนาม";
  const password = params.get("password") || "";

  // เช็คว่ารหัสที่ส่งมาตรงกับ Admin Password ใน .env ไหม
  const isAdmin = password === process.env.ADMIN_PASSWORD;

  const presenceData = {
    user_id: `user-${Math.random().toString(36).substring(2, 9)}`,
    user_info: { 
      name: nickname,
      isAdmin: isAdmin 
    }, 
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channelName, presenceData);
  return NextResponse.json(authResponse);
}