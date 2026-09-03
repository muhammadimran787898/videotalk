import { useSocket } from "@/store/socket";
import { useParams } from "next/navigation";

const { useState, useEffect, useRef } = require("react");

const getPersistentUserId = () => {
  if (typeof window === "undefined") return undefined;
  let id = localStorage.getItem("streamtalk_user_id");
  if (!id) {
    id = `usr_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    localStorage.setItem("streamtalk_user_id", id);
  }
  return id;
};

const usePeer = () => {
  const socket = useSocket();
  const { roomId } = useParams();
  const [peer, setPeer] = useState(null);
  const [myId, setMyId] = useState("");
  const isPeerSetRef = useRef(false);

  useEffect(() => {
    if (isPeerSetRef.current || !roomId || !socket) return;
    isPeerSetRef.current = true;
    let myPeer;

    const initPeer = async () => {
      try {
        console.log("🔄 Initializing PeerJS...");
        const Peer = (await import("peerjs")).default;
        const customId = getPersistentUserId();

        const peerConfig = {
          config: {
            iceServers: [
              { urls: "stun:stun.l.google.com:19302" },
              { urls: "stun:stun1.l.google.com:19302" },
              { urls: "stun:stun2.l.google.com:19302" },
              { urls: "stun:stun3.l.google.com:19302" },
              { urls: "stun:stun4.l.google.com:19302" },
              { urls: "stun:global.stun.twilio.com:3478" },
              {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelayproject",
                credential: "openrelayproject",
              },
              {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelayproject",
                credential: "openrelayproject",
              },
              {
                urls: "turn:openrelay.metered.ca:443?transport=tcp",
                username: "openrelayproject",
                credential: "openrelayproject",
              },
            ],
            sdpSemantics: "unified-plan",
            iceCandidatePoolSize: 10,
          },
          debug: process.env.NODE_ENV === "development" ? 2 : 0,
        };

        // Initialize PeerJS with persistent ID if available
        myPeer = customId ? new Peer(customId, peerConfig) : new Peer(peerConfig);
        setPeer(myPeer);

        myPeer.on("open", (id) => {
          console.log("✅ PeerJS connected! Your peer ID:", id);
          setMyId(id);

          const savedName = typeof window !== "undefined" ? localStorage.getItem("streamtalk_username") || "" : "";
          console.log("📡 Joining room:", roomId, "with peer ID:", id, "name:", savedName);
          socket.emit("join-room", roomId, id, savedName);
        });

        myPeer.on("error", (error) => {
          console.error("❌ PeerJS error:", error);

          // Only reconnect for server/socket errors, NOT per-peer connection failures
          const isConnectionError =
            error.type === "network" ||
            error.type === "server-error" ||
            error.type === "socket-error" ||
            error.type === "socket-closed" ||
            (typeof error === "string" &&
              (error.includes("Lost connection") ||
                error.includes("socket") ||
                error.includes("network")));

          if (isConnectionError) {
            setTimeout(() => {
              if (!myPeer.destroyed && myPeer.disconnected) {
                console.log("🔄 Retrying PeerJS connection...");
                myPeer.reconnect();
              }
            }, 2000);
          }
          // "webrtc" / "Could not connect to peer" errors are per-peer ICE failures
          // and do not require reconnecting to the signaling server
        });

        myPeer.on("disconnected", () => {
          console.log("⚠️ PeerJS disconnected, attempting to reconnect...");
          setTimeout(() => {
            if (!myPeer.destroyed && myPeer.disconnected) {
              myPeer.reconnect();
            }
          }, 2000);
        });
      } catch (error) {
        console.error("❌ Failed to initialize PeerJS:", error);
        isPeerSetRef.current = false; // Allow retry
      }
    };

    initPeer();

    // Cleanup function
    return () => {
      if (myPeer && !myPeer.destroyed) {
        console.log("🧹 Cleaning up PeerJS connection...");
        myPeer.destroy();
      }
    };
  }, [roomId, socket]);

  return {
    peer,
    myId,
  };
};

export default usePeer;
