"use client";

import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSocket } from "@/store/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import Logo from "@/components/logo";

export default function Home() {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [userName, setUserName] = useState("");
  const socket = useSocket();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedName = localStorage.getItem("streamtalk_username");
      if (savedName) setUserName(savedName);
    }
  }, []);

  const saveName = (name) => {
    setUserName(name);
    if (name.trim() && typeof window !== "undefined") {
      localStorage.setItem("streamtalk_username", name.trim());
    }
  };

  const [eventStatus, setEventStatus] = useState(null);
  const connectionStatus =
    eventStatus ??
    (socket
      ? socket.isConnected
        ? "Connected"
        : socket.isConnecting
          ? "Connecting..."
          : "Ready"
      : "Checking...");

  useEffect(() => {
    if (socket) {
      const onConnecting = () => setEventStatus("Connecting...");
      const onConnect = () => setEventStatus("Connected");
      const onDisconnect = () => setEventStatus("Disconnected");
      const onError = () => setEventStatus("Connection failed");

      socket.on("connecting", onConnecting);
      socket.on("connect", onConnect);
      socket.on("disconnect", onDisconnect);
      socket.on("connect_error", onError);

      return () => {
        socket.off("connecting", onConnecting);
        socket.off("connect", onConnect);
        socket.off("disconnect", onDisconnect);
        socket.off("connect_error", onError);
      };
    }
  }, [socket]);

  const cleanRoomId = (rawInput) => {
    if (!rawInput) return "";
    let trimmed = rawInput.trim();
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
      try {
        const url = new URL(trimmed);
        const parts = url.pathname.split("/").filter(Boolean);
        return parts[parts.length - 1] || trimmed;
      } catch (e) {
        return trimmed;
      }
    }
    return trimmed;
  };

  const createAndJoin = () => {
    const newRoomId = uuidv4();
    if (userName.trim() && typeof window !== "undefined") {
      localStorage.setItem("streamtalk_username", userName.trim());
    }
    router.push(`/${newRoomId}`);
  };

  const joinRoom = (e) => {
    e?.preventDefault();
    const finalRoomId = cleanRoomId(roomIdInput);
    if (finalRoomId) {
      if (userName.trim() && typeof window !== "undefined") {
        localStorage.setItem("streamtalk_username", userName.trim());
      }
      router.push(`/${finalRoomId}`);
    }
  };

  const getStatusVariant = () => {
    if (connectionStatus === "Connected") return "secondary";
    if (connectionStatus.includes("Connect")) return "outline";
    if (connectionStatus === "Disconnected" || connectionStatus === "Connection failed")
      return "destructive";
    return "secondary";
  };

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Subtle radial depth */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--muted)/0.2)_0%,transparent_70%)] pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 w-full max-w-sm mx-auto text-center animate-fade-in space-y-6">
        {/* Header Logo */}
        <div className="flex flex-col items-center gap-2">
          <Logo size="lg" />
          <p className="text-xs sm:text-sm text-muted-foreground max-w-xs mt-1">
            Instant HD video calls, screen sharing & direct messaging.
          </p>
        </div>

        {/* Connection badge */}
        <div className="flex justify-center">
          <Badge variant={getStatusVariant()} className="gap-1.5 px-3 py-1 text-xs">
            <span
              className={`w-2 h-2 rounded-full ${
                connectionStatus === "Connected"
                  ? "bg-green-500"
                  : connectionStatus.includes("Connect")
                    ? "bg-yellow-500 animate-pulse"
                    : connectionStatus === "Disconnected" ||
                        connectionStatus === "Connection failed"
                      ? "bg-red-500"
                      : "bg-muted-foreground"
              }`}
            />
            {connectionStatus}
          </Badge>
        </div>

        {/* Join / Create Form */}
        <form onSubmit={joinRoom} className="space-y-3.5 text-left">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Your Name (Optional)
            </label>
            <Input
              placeholder="e.g. Alex, Sarah"
              value={userName}
              onChange={(e) => saveName(e.target.value)}
              className="text-sm h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Room Link or Code
            </label>
            <Input
              placeholder="Paste room link or enter code"
              value={roomIdInput}
              onChange={(e) => setRoomIdInput(e.target.value)}
              className="text-sm h-10"
            />
          </div>

          <div className="flex gap-2.5 pt-1">
            <Button
              type="submit"
              className="flex-1 h-10 text-sm font-medium"
            >
              Join Call
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={createAndJoin}
              className="flex-1 h-10 text-sm font-medium"
            >
              New Room
            </Button>
          </div>
        </form>

        {/* Footer */}
        <p className="text-xs text-muted-foreground pt-4">
          No sign-up needed. Peer-to-peer encrypted calls.
        </p>
      </div>
    </div>
  );
}
