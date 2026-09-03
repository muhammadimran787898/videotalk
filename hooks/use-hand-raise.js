import { useState, useCallback, useEffect } from "react";
import { showToast } from "@/components/toast-notification";

export const useHandRaise = (socket, roomId, myId) => {
  const [raisedHands, setRaisedHands] = useState(new Set());

  const isHandRaised = raisedHands.has(myId);

  const toggleHandRaise = useCallback(() => {
    const savedName = typeof window !== "undefined" ? localStorage.getItem("streamtalk_username") : null;
    const myName = savedName?.trim() || "You";

    setRaisedHands((prev) => {
      const next = new Set(prev);
      if (next.has(myId)) {
        next.delete(myId);
        showToast("Lowered your hand", "info");
        if (socket && roomId) {
          socket.emit("toggle-hand-raise", { roomId, userId: myId, userName: myName, isRaised: false });
        }
      } else {
        next.add(myId);
        showToast("✋ You raised your hand!", "info");
        if (socket && roomId) {
          socket.emit("toggle-hand-raise", { roomId, userId: myId, userName: myName, isRaised: true });
        }
      }
      return next;
    });
  }, [socket, roomId, myId]);

  useEffect(() => {
    if (!socket) return;

    const handleHandRaisedEvent = (data) => {
      const { userId, userName, isRaised } = data;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (isRaised) {
          next.add(userId);
          if (userId !== myId) {
            const nameToDisplay = userName || socket?.userProfiles?.[userId] || `User ${userId?.slice(0, 4)}`;
            showToast(`✋ ${nameToDisplay} raised their hand to ask a question!`, "info");
          }
        } else {
          next.delete(userId);
        }
        return next;
      });
    };

    socket.on("hand-raise-updated", handleHandRaisedEvent);

    return () => {
      socket.off("hand-raise-updated", handleHandRaisedEvent);
    };
  }, [socket, myId]);

  return {
    raisedHands,
    isHandRaised,
    toggleHandRaise,
  };
};

export default useHandRaise;
