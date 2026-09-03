import React from "react";

const EmojiReactionsOverlay = ({ activeReactions = [] }) => {
  if (activeReactions.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
      {activeReactions.map((item) => (
        <div
          key={item.id}
          className="absolute bottom-16 text-3xl sm:text-4xl animate-emoji-float select-none"
          style={{ left: `${item.left}%` }}
        >
          {item.emoji}
        </div>
      ))}
    </div>
  );
};

export default EmojiReactionsOverlay;
