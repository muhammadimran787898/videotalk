import ReactPlayer from "react-player";
import { Mic, MicOff, Users, MoreVertical, UserX, Pin, Hand } from "lucide-react";
import { memo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import EmojiReactionsOverlay from "@/components/emoji-reactions";

// --- PlayerCard (defined at module level — React 19 static-components rule) ---

const PlayerCard = memo(
  ({
    playerId,
    player,
    isHighlighted = false,
    isAudioEnabled,
    myId,
    isHost = false,
    isHandRaised = false,
    onPlayerClick,
    onRemoveUser,
    selectedAudioOutput,
  }) => {
    const isMe = playerId === myId;
    const playerMuted = isMe
      ? !isAudioEnabled
      : !(player.audioEnabled ?? !player.muted);

    const savedName = isMe && typeof window !== "undefined" ? localStorage.getItem("streamtalk_username") : null;
    const rawName = savedName?.trim() || player.name;
    const nameToDisplay = rawName || (isMe ? "You" : `User ${playerId?.slice(0, 4) || ""}`);
    const badgeLabel = isMe && rawName ? `${rawName} (You)` : nameToDisplay;

    return (
      <div
        className={`relative cursor-pointer transition-all duration-200 w-full h-full overflow-hidden ${
          isHighlighted ? "rounded-2xl" : "rounded-xl border border-white/20"
        }`}
        onClick={() => onPlayerClick?.(playerId)}
      >
        {/* Video Container */}
        <div
          className={`relative overflow-hidden transition-all duration-200 [&_video]:object-cover w-full h-full ${
            isHighlighted
              ? "bg-black"
              : "bg-black hover:ring-2 hover:ring-primary/60"
          }`}
          style={{ width: "100%", height: "100%" }}
        >
          {player.playing ? (
            <div
              style={{
                transform: isMe ? "scaleX(-1)" : "none",
                width: "100%",
                height: "100%",
              }}
            >
              <ReactPlayer
                url={player.url}
                muted={isMe ? true : playerMuted}
                playing={player.playing}
                width="100%"
                height="100%"
                className="object-cover"
                playsinline={true}
                config={{
                  file: {
                    attributes: {
                      playsInline: true,
                      autoPlay: true,
                    },
                  },
                }}
                onReady={(playerInstance) => {
                  const videoElement = playerInstance.getInternalPlayer();
                  if (videoElement) {
                    if (!isMe) {
                      videoElement.play().catch((err) => {
                        console.warn("Browser autoplay requires user interaction:", err);
                      });
                    }
                    if (
                      selectedAudioOutput &&
                      selectedAudioOutput !== "default" &&
                      videoElement.setSinkId
                    ) {
                      videoElement
                        .setSinkId(selectedAudioOutput)
                        .catch((err) => {
                          console.warn(
                            "Failed to set audio output device:",
                            err
                          );
                        });
                    }
                  }
                }}
              />
            </div>
          ) : (
            <div
              className="flex items-center justify-center bg-card"
              style={{
                width: "100%",
                height: "100%",
              }}
            >
              <Avatar className={isHighlighted ? "w-16 h-16 sm:w-24 sm:h-24" : "w-10 h-10"}>
                <AvatarFallback className="text-muted-foreground font-semibold text-base sm:text-xl">
                  {(nameToDisplay?.slice(0, 2) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* Top-Right Circular Audio Status Badge */}
          <div className="absolute top-2 right-2 z-10 flex items-center gap-1.5">
            {isHandRaised && (
              <Badge variant="secondary" className="bg-amber-500 text-white p-1 rounded-full animate-bounce shadow-md">
                <Hand size={12} />
              </Badge>
            )}
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md backdrop-blur-md ${
                playerMuted
                  ? "bg-black/60 text-rose-400 border border-white/20"
                  : "bg-blue-600 text-white animate-pulse"
              }`}
            >
              {playerMuted ? <MicOff size={11} /> : <Mic size={11} />}
            </div>
          </div>

          {/* User Info Overlay (Bottom Left) */}
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 z-10">
            <Badge variant="secondary" className="text-[10px] sm:text-xs font-medium px-2 py-0.5 max-w-[140px] truncate shadow-md backdrop-blur-md bg-black/60 text-white border border-white/20">
              {badgeLabel}
            </Badge>
          </div>

          {/* Host Moderation Settings Dropdown Button */}
          {isHost && !isMe && (
            <div
              className="absolute top-2 left-2 z-20"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="w-6 h-6 rounded-full bg-black/60 hover:bg-black/90 text-white border border-white/20 backdrop-blur-md shadow-md"
                  >
                    <MoreVertical size={13} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => onPlayerClick?.(playerId)}>
                    <Pin size={13} className="text-primary" />
                    <span>Pin to Main Screen</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onRemoveUser?.(playerId)}
                    className="text-destructive focus:text-destructive focus:bg-destructive/10"
                  >
                    <UserX size={13} />
                    <span>Remove from Call</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    return (
      prevProps.playerId === nextProps.playerId &&
      prevProps.player.url === nextProps.player.url &&
      prevProps.player.muted === nextProps.player.muted &&
      prevProps.player.playing === nextProps.player.playing &&
      prevProps.isHighlighted === nextProps.isHighlighted &&
      prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
      prevProps.isHandRaised === nextProps.isHandRaised &&
      prevProps.myId === nextProps.myId &&
      prevProps.isHost === nextProps.isHost &&
      prevProps.selectedAudioOutput === nextProps.selectedAudioOutput
    );
  }
);

PlayerCard.displayName = "PlayerCard";

// --- SimpleVideoGrid ---

const SimpleVideoGrid = ({
  players,
  highlightedPlayerId,
  onPlayerClick,
  onRemoveUser,
  myId,
  isHost = false,
  className = "",
  isAudioEnabled,
  selectedAudioOutput,
  raisedHands = new Set(),
  activeReactions = [],
}) => {
  const playerEntries = Object.entries(players || {});
  const [pinnedPlayerId, setPinnedPlayerId] = useState(null);

  // Active Main Stage player: Pinned ID -> Highlighted/Sharer ID -> First Remote User -> Yourself
  const mainStagePlayerId =
    pinnedPlayerId && players[pinnedPlayerId]
      ? pinnedPlayerId
      : highlightedPlayerId && players[highlightedPlayerId]
      ? highlightedPlayerId
      : playerEntries.find(([id]) => id !== myId)?.[0] || myId;

  const mainStagePlayer = players[mainStagePlayerId];
  const sidebarPlayers = playerEntries.filter(
    ([id]) => id !== mainStagePlayerId
  );

  const handleSelectStage = (playerId) => {
    setPinnedPlayerId(playerId);
    onPlayerClick?.(playerId);
  };

  return (
    <div className={`relative w-full h-full bg-black overflow-hidden flex flex-col p-2 sm:p-3 ${className}`}>
      {/* Animated Floating Emoji Reactions Overlay */}
      <EmojiReactionsOverlay activeReactions={activeReactions} />

      {/* Top Left Meeting Header Overlay */}
      <div className="absolute top-4 left-4 z-30 flex flex-col gap-0.5 text-white drop-shadow-md">
        <h2 className="text-sm sm:text-base font-bold tracking-tight">
          Design Team Meeting
        </h2>
        <div className="flex items-center gap-1.5 text-xs text-white/80 font-medium">
          <Users size={13} />
          <span>{playerEntries.length} participants</span>
        </div>
      </div>

      {/* Main Container: Stage View + Right Vertical Sidebar */}
      {mainStagePlayer ? (
        <div className="w-full h-full flex flex-col md:flex-row gap-2 sm:gap-3 overflow-hidden">
          {/* Main Stage Video View (Left / Center) */}
          <div className="flex-1 flex items-center justify-center min-h-0 bg-black rounded-2xl overflow-hidden relative">
            <PlayerCard
              key={`stage-${mainStagePlayerId}`}
              playerId={mainStagePlayerId}
              player={mainStagePlayer}
              isHighlighted={true}
              isAudioEnabled={isAudioEnabled}
              myId={myId}
              isHost={isHost}
              isHandRaised={raisedHands.has(mainStagePlayerId)}
              onPlayerClick={handleSelectStage}
              onRemoveUser={onRemoveUser}
              selectedAudioOutput={selectedAudioOutput}
            />
          </div>

          {/* Right Vertical Sidebar for Joinee Cards (Matching Screenshot 1) */}
          {sidebarPlayers.length > 0 && (
            <div className="w-full md:w-56 lg:w-64 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto max-h-[160px] md:max-h-full p-0.5 scrollbar-thin">
              {sidebarPlayers.map(([playerId, player]) => (
                <div
                  key={`side-${playerId}`}
                  className="shrink-0 w-36 md:w-full h-28 md:h-36 rounded-xl overflow-hidden"
                >
                  <PlayerCard
                    playerId={playerId}
                    player={player}
                    isHighlighted={false}
                    isAudioEnabled={isAudioEnabled}
                    myId={myId}
                    isHost={isHost}
                    isHandRaised={raisedHands.has(playerId)}
                    onPlayerClick={handleSelectStage}
                    onRemoveUser={onRemoveUser}
                    selectedAudioOutput={selectedAudioOutput}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Empty State */
        <div className="w-full h-full flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-2 sm:space-y-3 px-4 text-white">
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto">
              <AvatarFallback>
                <Users size={18} className="text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <h3 className="text-sm sm:text-base font-medium">
              Waiting for participants
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground max-w-[240px] sm:max-w-xs">
              Share the room link to invite others to join the call
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default memo(SimpleVideoGrid, (prevProps, nextProps) => {
  const prevPlayerIds = Object.keys(prevProps.players || {}).sort();
  const nextPlayerIds = Object.keys(nextProps.players || {}).sort();

  return (
    prevPlayerIds.length === nextPlayerIds.length &&
    prevPlayerIds.every((id, index) => id === nextPlayerIds[index]) &&
    prevProps.highlightedPlayerId === nextProps.highlightedPlayerId &&
    prevProps.myId === nextProps.myId &&
    prevProps.isHost === nextProps.isHost &&
    prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
    JSON.stringify(prevProps.players) === JSON.stringify(nextProps.players)
  );
});
