import { useState, useCallback, useRef, useEffect } from "react";
import { useSocket } from "@/store/socket";

/**
 * Custom hook for WebRTC single-sharer screen sharing
 * Handles getDisplayMedia, track replacement across peer connections,
 * native browser stop events, and room-wide single sharer lock.
 */
const useScreenShare = (myId, roomId, cameraStream, users = {}, setPlayers) => {
  const socket = useSocket();
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeScreenSharer, setActiveScreenSharer] = useState(null);
  const screenStreamRef = useRef(null);

  // Synchronize room active screen sharer from socket
  useEffect(() => {
    if (!socket) return;

    const handleSharerChanged = (sharer) => {
      setActiveScreenSharer(sharer);
    };

    socket.on("screen-sharer-changed", handleSharerChanged);

    if (socket.activeScreenSharer) {
      setActiveScreenSharer(socket.activeScreenSharer);
    }

    return () => {
      socket.off("screen-sharer-changed", handleSharerChanged);
    };
  }, [socket]);

  // Replace video track across all active peer connections
  const replaceVideoTrackAcrossPeers = useCallback(
    async (newVideoTrack) => {
      if (!users || Object.keys(users).length === 0) return;

      Object.values(users).forEach((call) => {
        if (call?.peerConnection) {
          const senders = call.peerConnection.getSenders();
          const videoSender = senders.find(
            (sender) => sender.track && sender.track.kind === "video"
          );
          if (videoSender) {
            videoSender.replaceTrack(newVideoTrack).catch((err) => {
              console.error("Failed to replace video track on peer:", err);
            });
          }
        }
      });
    },
    [users]
  );

  const stopScreenShare = useCallback(async () => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((track) => track.stop());
      screenStreamRef.current = null;
    }

    setIsScreenSharing(false);

    // Revert local player stream to original camera stream
    if (cameraStream && myId && setPlayers) {
      const cameraVideoTrack = cameraStream.getVideoTracks()[0];

      setPlayers((prev) => ({
        ...prev,
        [myId]: {
          ...prev[myId],
          url: cameraStream,
          playing: cameraVideoTrack ? cameraVideoTrack.enabled : true,
        },
      }));

      if (cameraVideoTrack) {
        await replaceVideoTrackAcrossPeers(cameraVideoTrack);
      }
    }

    // Notify backend/room that screen share stopped
    if (socket && myId && roomId) {
      socket.emit("user-stop-screen-share", myId, roomId);
    }
  }, [cameraStream, myId, roomId, socket, setPlayers, replaceVideoTrackAcrossPeers]);

  const startScreenShare = useCallback(async () => {
    if (!myId || !roomId || !socket) return false;

    // Check single-sharer rule
    if (activeScreenSharer && activeScreenSharer.userId !== myId) {
      alert(
        `Screen sharing is active by ${
          activeScreenSharer.userName || "another participant"
        }. Only one person can share at a time.`
      );
      return false;
    }

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "always" },
        audio: false,
      });

      const screenVideoTrack = displayStream.getVideoTracks()[0];
      if (!screenVideoTrack) return false;

      screenStreamRef.current = displayStream;

      const savedName =
        typeof window !== "undefined"
          ? localStorage.getItem("streamtalk_username")
          : "";
      const res = await socket.emit(
        "user-start-screen-share",
        myId,
        roomId,
        savedName || myId
      );

      if (res && res.success === false) {
        displayStream.getTracks().forEach((t) => t.stop());
        alert(res.error || "Screen sharing is active by another participant.");
        return false;
      }

      setIsScreenSharing(true);

      // Handle user clicking native browser "Stop sharing" floating bar
      screenVideoTrack.onended = () => {
        console.log("🖥️ Browser native stop sharing triggered");
        stopScreenShare();
      };

      // Update local player tile to display screen stream
      if (setPlayers) {
        setPlayers((prev) => ({
          ...prev,
          [myId]: {
            ...prev[myId],
            url: displayStream,
            playing: true,
          },
        }));
      }

      // Replace outgoing video track to all connected peers
      await replaceVideoTrackAcrossPeers(screenVideoTrack);

      return true;
    } catch (err) {
      if (err.name !== "NotAllowedError") {
        console.error("Error starting screen share:", err);
        alert("Failed to share screen: " + err.message);
      }
      return false;
    }
  }, [
    myId,
    roomId,
    socket,
    activeScreenSharer,
    stopScreenShare,
    setPlayers,
    replaceVideoTrackAcrossPeers,
  ]);

  const toggleScreenShare = useCallback(() => {
    if (isScreenSharing) {
      stopScreenShare();
    } else {
      startScreenShare();
    }
  }, [isScreenSharing, startScreenShare, stopScreenShare]);

  return {
    isScreenSharing,
    activeScreenSharer,
    isAnotherSharing: !!(
      activeScreenSharer && activeScreenSharer.userId !== myId
    ),
    startScreenShare,
    stopScreenShare,
    toggleScreenShare,
  };
};

export default useScreenShare;
