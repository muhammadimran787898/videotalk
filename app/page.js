"use client";

import { v4 as uuidv4 } from "uuid";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useSocket } from "@/store/socket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const router = useRouter();
  const [roomIdInput, setRoomIdInput] = useState("");
  const [userName, setUserName] = useState("");
  const socket = useSocket();

  useEffect(() => {
    const savedName = localStorage.getItem("streamtalk_username");
    if (savedName) setUserName(savedName);
  }, []);

  const saveName = (name) => {
    setUserName(name);
    if (name.trim()) {
      localStorage.setItem("streamtalk_username", name.trim());
    }
  };

  // Derive initial status from socket state during render; events handle updates.
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
      socket.on("connecting", () => {
        setEventStatus("Connecting...");
      });

      socket.on("connect", () => {
        setEventStatus("Connected");
      });

      socket.on("disconnect", () => {
        setEventStatus("Disconnected");
      });

      socket.on("connect_error", () => {
        setEventStatus("Connection failed");
      });
    }
  }, [socket]);

  const cleanRoomId = (rawInput) => {
    if (!rawInput) return "";
    let trimmed = rawInput.trim();
    // If full URL was pasted, extract path segment
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
    if (userName.trim()) {
      localStorage.setItem("streamtalk_username", userName.trim());
    }
    router.push(`/${newRoomId}`);
  };

  const joinRoom = (e) => {
    e?.preventDefault();
    const finalRoomId = cleanRoomId(roomIdInput);
    if (finalRoomId) {
      if (userName.trim()) {
        localStorage.setItem("streamtalk_username", userName.trim());
      }
      router.push(`/${finalRoomId}`);
    } else {
      alert("Please enter a valid room ID or paste a room link.");
    }
  };

  const getStatusVariant = () => {
    if (connectionStatus === "Connected") return "default";
    if (connectionStatus.includes("Connect")) return "secondary";
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
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground mb-1">
            StreamTalk
          </h1>
          <p className="text-sm text-muted-foreground">
            Instant live video calls & peer-to-peer chat.
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
