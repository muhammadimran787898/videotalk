import { useState, useCallback, useEffect } from "react";

export const EMOJIS = [
  { symbol: "❤️", label: "Heart" },
  { symbol: "👍", label: "Thumbs Up" },
  { symbol: "👏", label: "Clap" },
  { symbol: "🎉", label: "Party" },
  { symbol: "😂", label: "Joy" },
  { symbol: "😮", label: "Surprised" },
];

export const useReactions = (socket, roomId, myId) => {
  const [activeReactions, setActiveReactions] = useState([]);

  const sendReaction = useCallback(
    (emoji) => {
      const id = `${Date.now()}-${Math.random()}`;
      const newReaction = {
        id,
        emoji,
        senderId: myId,
        left: Math.floor(Math.random() * 60) + 20, // 20% to 80% horizontal position
      };

      setActiveReactions((prev) => [...prev, newReaction]);

      if (socket && roomId) {
        socket.emit("send-reaction", { roomId, emoji, senderId: myId });
      }

      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3500);
    },
    [socket, roomId, myId]
  );

  useEffect(() => {
    if (!socket) return;

    const handleIncomingReaction = (data) => {
      if (data.senderId === myId) return;
      const id = `${Date.now()}-${Math.random()}`;
      const newReaction = {
        id,
        emoji: data.emoji,
        senderId: data.senderId,
        left: Math.floor(Math.random() * 60) + 20,
      };

      setActiveReactions((prev) => [...prev, newReaction]);

      setTimeout(() => {
        setActiveReactions((prev) => prev.filter((r) => r.id !== id));
      }, 3500);
    };

    socket.on("incoming-reaction", handleIncomingReaction);

    return () => {
      socket.off("incoming-reaction", handleIncomingReaction);
    };
  }, [socket, myId]);

  return {
    activeReactions,
    sendReaction,
    EMOJIS,
  };
};

export default useReactions;
