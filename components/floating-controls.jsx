import React, { useState } from "react";
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  MessageCircle,
  Smile,
  Hand,
  Sparkles,
  MoreVertical,
  MonitorUp,
  X,
  ChevronDown,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { showToast } from "@/components/toast-notification";

const FloatingControls = ({
  muted,
  playing,
  toggleAudio,
  toggleVideo,
  leaveRoom,
  onToggleChat,
  onToggleParticipants,
  participantCount = 1,
  isChatOpen = false,
  isParticipantsOpen = false,
  unreadCount = 0,
  isScreenSharing = false,
  toggleScreenShare,
  isAnotherSharing = false,
  activeScreenSharer = null,
  // Reactions & Hand raise
  onSendReaction,
  isHandRaised = false,
  toggleHandRaise,
  emojis = [],
  callDuration = 0,
}) => {
  const [blurBackground, setBlurBackground] = useState(false);

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (seconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleToggleBlur = () => {
    setBlurBackground((prev) => {
      const next = !prev;
      showToast(next ? "Background Blur enabled" : "Background Blur disabled", "info");
      return next;
    });
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-[95vw] px-2 animate-fade-in">
      <div className="bg-[#1e1e1e]/95 border border-white/10 shadow-2xl backdrop-blur-xl text-white rounded-full px-2.5 sm:px-3.5 py-1.5 flex items-center gap-1 sm:gap-2">
        {/* 1. Microphone Control [ 🎤 ⌄ ] */}
        <div className="flex items-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <button
            onClick={toggleAudio}
            className={`p-2 rounded-l-full text-xs font-medium flex items-center justify-center ${
              muted ? "text-rose-400" : "text-white"
            }`}
            title={muted ? "Unmute mic" : "Mute mic"}
          >
            {muted ? <MicOff size={16} /> : <Mic size={16} />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="pr-2 pl-0.5 py-2 text-white/70 hover:text-white">
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-[#252525] border-white/10 text-white">
              <DropdownMenuItem onClick={toggleAudio}>
                {muted ? "Unmute Microphone" : "Mute Microphone"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* 2. Camera Control [ 📹 ⌄ ] */}
        <div className="flex items-center bg-white/10 rounded-full hover:bg-white/20 transition-colors">
          <button
            onClick={toggleVideo}
            className={`p-2 rounded-l-full text-xs font-medium flex items-center justify-center ${
              !playing ? "text-rose-400" : "text-white"
            }`}
            title={!playing ? "Turn camera on" : "Turn camera off"}
          >
            {!playing ? <VideoOff size={16} /> : <Video size={16} />}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="pr-2 pl-0.5 py-2 text-white/70 hover:text-white">
                <ChevronDown size={12} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-[#252525] border-white/10 text-white">
              <DropdownMenuItem onClick={toggleVideo}>
                {!playing ? "Start Video" : "Stop Video"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-white/20 my-auto hidden sm:block" />

        {/* 3. Participants Control [ 👥 5 ⌄ ] */}
        <button
          onClick={onToggleParticipants}
          className={`px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isParticipantsOpen
              ? "bg-blue-600 text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title="Participants"
        >
          <Users size={15} />
          <span>{participantCount}</span>
          <ChevronDown size={11} className="opacity-70" />
        </button>

        {/* 4. Chat Control [ 💬 🔟 ⌄ ] */}
        <button
          onClick={onToggleChat}
          className={`relative px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-colors ${
            isChatOpen
              ? "bg-blue-600 text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title="Chat"
        >
          <MessageCircle size={15} />
          {unreadCount > 0 && (
            <span className="bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
          <ChevronDown size={11} className="opacity-70" />
        </button>

        {/* 5. Emoji Reactions Picker [ 😀 ⌄ ] */}
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="px-2.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Reactions"
            >
              <Smile size={15} />
              <ChevronDown size={11} className="opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" className="w-auto p-2 bg-[#252525] border-white/10 shadow-2xl rounded-full">
            <div className="flex items-center gap-1.5">
              {emojis.map((item) => (
                <button
                  key={item.symbol}
                  onClick={() => onSendReaction?.(item.symbol)}
                  className="p-1.5 text-lg hover:scale-125 transition-transform"
                  title={item.label}
                >
                  {item.symbol}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        {/* 6. Raise Hand [ ✋ ] */}
        <button
          onClick={toggleHandRaise}
          className={`p-2 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
            isHandRaised
              ? "bg-amber-500 text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title={isHandRaised ? "Lower hand" : "Raise hand"}
        >
          <Hand size={16} />
        </button>

        {/* 7. Visual Effects [ ✨ ⌄ ] */}
        <button
          onClick={handleToggleBlur}
          className={`hidden md:flex px-2.5 py-1.5 rounded-full text-xs font-medium items-center gap-1 transition-colors ${
            blurBackground
              ? "bg-purple-600 text-white"
              : "bg-white/10 hover:bg-white/20 text-white"
          }`}
          title="Visual effects"
        >
          <Sparkles size={15} />
          <ChevronDown size={11} className="opacity-70" />
        </button>

        {/* 8. More Options [ ⋮ ] */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="p-2 rounded-full text-xs font-medium flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="More options"
            >
              <MoreVertical size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="end" className="w-48 bg-[#252525] border-white/10 text-white">
            <DropdownMenuItem onClick={onToggleParticipants}>
              <Users size={14} />
              <span>Participants ({participantCount})</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleChat}>
              <MessageCircle size={14} />
              <span>In-call Messages</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleToggleBlur}>
              <Sparkles size={14} />
              <span>{blurBackground ? "Disable Blur" : "Enable Background Blur"}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-white/20 my-auto hidden sm:block" />

        {/* 9. Screen Share [ 🔲 ] */}
        {toggleScreenShare && (
          <button
            onClick={toggleScreenShare}
            disabled={isAnotherSharing}
            className={`p-2 rounded-full text-xs font-medium flex items-center justify-center transition-colors ${
              isScreenSharing
                ? "bg-blue-600 text-white"
                : isAnotherSharing
                ? "bg-white/5 text-white/30 cursor-not-allowed"
                : "bg-white/10 hover:bg-white/20 text-white"
            }`}
            title={
              isScreenSharing
                ? "Stop screen share"
                : isAnotherSharing
                ? `Screen shared by ${activeScreenSharer?.userName || "another user"}`
                : "Share screen"
            }
          >
            <MonitorUp size={16} />
          </button>
        )}

        {/* 10. Call Timer / Recording Indicator [ 🔴 00:32 ] */}
        <div className="hidden sm:flex items-center gap-1.5 bg-white/10 rounded-full px-2.5 py-1 text-xs font-medium">
          <Circle size={8} className="fill-rose-500 text-rose-500 animate-pulse" />
          <span className="font-mono text-[11px]">{formatTimer(callDuration)}</span>
        </div>

        {/* Vertical Divider */}
        <div className="h-5 w-px bg-white/20 my-auto" />

        {/* 11. Red Leave/End Call Button [ ❌ ] */}
        <button
          onClick={leaveRoom}
          className="p-2 sm:px-3 sm:py-2 rounded-full bg-rose-600 hover:bg-rose-700 text-white flex items-center justify-center shadow-lg transition-transform active:scale-95"
          title="Leave call"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};

export default FloatingControls;
