import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RoleplayTH Chatroom",
  description: "Minimalist Roleplay Experience",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Google+Sans:ital,opsz,wght@0,17..18,400..700;1,17..18,400..700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ fontFamily: "'Google Sans', sans-serif" }} className="bg-black antialiased">
        {children}
      </body>
    </html>
  );
}