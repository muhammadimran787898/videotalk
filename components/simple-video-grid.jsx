import ReactPlayer from "react-player";
import { Mic, MicOff, Users } from "lucide-react";
import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

// --- Pure helpers (outside component so they're stable references) ---

const getGridCols = (count) => {
  if (count === 1) return "grid-cols-1";
  if (count === 2) return "grid-cols-1 sm:grid-cols-2";
  if (count <= 4) return "grid-cols-1 sm:grid-cols-2";
  return "grid-cols-1 sm:grid-cols-2 md:grid-cols-3";
};

const getVideoSize = (count, isHighlighted = false) => {
  if (isHighlighted) {
    return { minHeight: "clamp(180px, 35vh, 400px)", maxHeight: "60vh" };
  }
  if (count === 1) return { minHeight: "clamp(160px, 28vh, 300px)", maxHeight: "50vh" };
  if (count === 2) return { minHeight: "clamp(130px, 22vh, 250px)", maxHeight: "40vh" };
  if (count <= 4) return { minHeight: "clamp(110px, 18vh, 200px)", maxHeight: "30vh" };
  return { minHeight: "clamp(90px, 15vh, 150px)", maxHeight: "25vh" };
};

// --- PlayerCard (defined at module level — React 19 static-components rule) ---

const PlayerCard = memo(
  ({
    playerId,
    player,
    isHighlighted = false,
    totalCount = 1,
    isAudioEnabled,
    myId,
    onPlayerClick,
    selectedAudioOutput,
  }) => {
    const isMe = playerId === myId;
    const videoSize = getVideoSize(totalCount, isHighlighted);
    const playerMuted = isMe
      ? !isAudioEnabled
      : !(player.audioEnabled ?? !player.muted);

    const savedName = isMe && typeof window !== "undefined" ? localStorage.getItem("streamtalk_username") : null;
    const rawName = savedName?.trim() || player.name;
    const nameToDisplay = rawName || (isMe ? "You" : `User ${playerId?.slice(0, 4) || ""}`);
    const badgeLabel = isMe && rawName ? `${rawName} (You)` : nameToDisplay;

    return (
      <div
        className={`relative cursor-pointer transition-all duration-200 w-full h-full ${
          isHighlighted ? "col-span-full" : ""
        }`}
        onClick={() => onPlayerClick?.(playerId)}
      >
        {/* Video Container */}
        <div
          className={`relative overflow-hidden rounded-lg transition-all duration-200 aspect-video [&_video]:object-cover w-full h-full ${
            isHighlighted
              ? "ring-2 ring-primary/80 bg-black"
              : "border border-border bg-black hover:border-border/70"
          }`}
          style={
            isHighlighted
              ? { width: "100%", height: "100%", minHeight: "220px" }
              : { height: videoSize.minHeight }
          }
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
              <Avatar className="w-10 h-10 sm:w-14 sm:h-16">
                <AvatarFallback className="text-muted-foreground font-semibold text-sm sm:text-lg">
                  {(nameToDisplay?.slice(0, 2) || "U").toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </div>
          )}

          {/* User Info Overlay */}
          <div className="absolute bottom-1.5 sm:bottom-2 left-1.5 sm:left-2 flex items-center gap-1 sm:gap-1.5 z-10">
            <Badge
              variant={playerMuted ? "destructive" : "secondary"}
              className="px-1 h-4 sm:h-5"
            >
              {playerMuted ? (
                <MicOff size={9} />
              ) : (
                <Mic size={9} />
              )}
            </Badge>
            <Badge variant="secondary" className="text-[9px] sm:text-[10px] font-medium px-1.5 h-4 sm:h-5 max-w-[120px] truncate">
              {badgeLabel}
            </Badge>
          </div>
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
      prevProps.totalCount === nextProps.totalCount &&
      prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
      prevProps.myId === nextProps.myId &&
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
  myId,
  className = "",
  isAudioEnabled,
  selectedAudioOutput,
}) => {
  const playerEntries = Object.entries(players || {});
  const highlightedPlayer = highlightedPlayerId
    ? players[highlightedPlayerId]
    : null;
  const otherPlayers = playerEntries.filter(
    ([id]) => id !== highlightedPlayerId
  );

  return (
    <div
      className={`w-full h-full flex flex-col justify-center items-center ${className}`}
    >
      {/* Presentation View (Screen Share Active) */}
      {highlightedPlayer ? (
        <div className="w-full h-full flex flex-col md:flex-row gap-2 sm:gap-3 p-1 overflow-hidden max-h-full">
          {/* Left Main Screen Share View */}
          <div className="flex-1 flex items-center justify-center min-h-0 bg-black/40 rounded-xl overflow-hidden border border-border/60 p-1 relative">
            <PlayerCard
              key={`main-${highlightedPlayerId}`}
              playerId={highlightedPlayerId}
              player={highlightedPlayer}
              isHighlighted={true}
              totalCount={playerEntries.length}
              isAudioEnabled={isAudioEnabled}
              myId={myId}
              onPlayerClick={onPlayerClick}
              selectedAudioOutput={selectedAudioOutput}
            />
          </div>

          {/* Right Side Joinees Sidebar */}
          {otherPlayers.length > 0 && (
            <div className="w-full md:w-52 lg:w-60 shrink-0 flex md:flex-col gap-2 overflow-x-auto md:overflow-y-auto max-h-[160px] md:max-h-full p-1 scrollbar-thin">
              {otherPlayers.map(([playerId, player]) => (
                <div key={`side-${playerId}`} className="shrink-0 w-36 md:w-full h-28 md:h-36">
                  <PlayerCard
                    playerId={playerId}
                    player={player}
                    isHighlighted={false}
                    totalCount={otherPlayers.length}
                    isAudioEnabled={isAudioEnabled}
                    myId={myId}
                    onPlayerClick={onPlayerClick}
                    selectedAudioOutput={selectedAudioOutput}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Normal Grid View when no screen share is active */
        <>
          {otherPlayers.length > 0 && (
            <div className="flex justify-center items-center w-full h-full">
              <div
                className={`grid gap-1.5 sm:gap-2 md:gap-3 ${getGridCols(otherPlayers.length)} w-full max-w-full sm:max-w-3xl md:max-w-6xl justify-items-center`}
              >
                {otherPlayers.map(([playerId, player]) => (
                  <PlayerCard
                    key={`${playerId}-${player.url}`}
                    playerId={playerId}
                    player={player}
                    isHighlighted={false}
                    totalCount={playerEntries.length}
                    isAudioEnabled={isAudioEnabled}
                    myId={myId}
                    onPlayerClick={onPlayerClick}
                    selectedAudioOutput={selectedAudioOutput}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Single player view */}
          {otherPlayers.length === 0 && playerEntries.length === 1 && (
            <div className="flex justify-center items-center w-full px-1 sm:px-0">
              <div className="w-full max-w-md sm:max-w-2xl md:max-w-3xl mx-auto">
                <PlayerCard
                  key={`${playerEntries[0][0]}-${playerEntries[0][1].url}`}
                  playerId={playerEntries[0][0]}
                  player={playerEntries[0][1]}
                  isHighlighted={false}
                  totalCount={1}
                  isAudioEnabled={isAudioEnabled}
                  myId={myId}
                  onPlayerClick={onPlayerClick}
                  selectedAudioOutput={selectedAudioOutput}
                />
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State */}
      {playerEntries.length === 0 && (
        <div className="w-full h-full flex items-center justify-center animate-fade-in">
          <div className="text-center space-y-2 sm:space-y-3 px-4">
            <Avatar className="w-12 h-12 sm:w-16 sm:h-16 mx-auto">
              <AvatarFallback>
                <Users size={18} className="text-muted-foreground" />
              </AvatarFallback>
            </Avatar>
            <h3 className="text-sm sm:text-base font-medium text-foreground">
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
    prevProps.isAudioEnabled === nextProps.isAudioEnabled &&
    JSON.stringify(prevProps.players) === JSON.stringify(nextProps.players)
  );
});
