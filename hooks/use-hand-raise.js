import { useState, useCallback, useEffect } from "react";

export const useHandRaise = (socket, roomId, myId) => {
  const [raisedHands, setRaisedHands] = useState(new Set());

  const isHandRaised = raisedHands.has(myId);

  const toggleHandRaise = useCallback(() => {
    setRaisedHands((prev) => {
      const next = new Set(prev);
      if (next.has(myId)) {
        next.delete(myId);
        if (socket && roomId) {
          socket.emit("toggle-hand-raise", { roomId, userId: myId, isRaised: false });
        }
      } else {
        next.add(myId);
        if (socket && roomId) {
          socket.emit("toggle-hand-raise", { roomId, userId: myId, isRaised: true });
        }
      }
      return next;
    });
  }, [socket, roomId, myId]);

  useEffect(() => {
    if (!socket) return;

    const handleHandRaisedEvent = (data) => {
      const { userId, isRaised } = data;
      setRaisedHands((prev) => {
        const next = new Set(prev);
        if (isRaised) {
          next.add(userId);
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
  }, [socket]);

  return {
    raisedHands,
    isHandRaised,
    toggleHandRaise,
  };
};

export default useHandRaise;
