"use client";
import dynamic from "next/dynamic";

const VideoCall = dynamic(() => import("./VideoCall"), { ssr: false });

export default function Home() {
  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <VideoCall />
    </main>
  );
}
