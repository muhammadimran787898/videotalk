"use client";

import { useEffect, useRef, useState } from "react";
import { cloneDeep } from "lodash";
import { useParams } from "next/navigation";

import { useSocket } from "@/store/socket";
import usePeer from "@/hooks/use-peer";
import useMediaStream from "@/hooks/use-media-stream";
import usePlayer from "@/hooks/use-player";
import useChat from "@/hooks/use-chat";
import useScreenShare from "@/hooks/use-screen-share";
import useReactions from "@/hooks/use-reactions";
import useHandRaise from "@/hooks/use-hand-raise";

import SimpleCallLayout from "@/components/simple-call-layout";
import FloatingControls from "@/components/floating-controls";
import SimpleVideoGrid from "@/components/simple-video-grid";
import SimpleChat from "@/components/simple-chat";
import ParticipantsDrawer from "@/components/participants-drawer";
import PermissionRequest from "@/components/permission-request";
import WaitingRoom from "@/components/waiting-room";
import HostApprovalBanner from "@/components/host-approval-banner";
import ToastContainer, { showToast } from "@/components/toast-notification";

const Room = () => {
  const socket = useSocket();
  const { roomId } = useParams();
  const { peer, myId } = usePeer();
  const {
    stream,
    isAudioEnabled,
    isVideoEnabled,
    toggleAudio: toggleStreamAudio,
    toggleVideo: toggleStreamVideo,
    error: mediaError,
    permissions,
    audioDevices,
    selectedAudioInput,
    selectedAudioOutput,
    switchAudioInput,
    switchAudioOutput,
  } = useMediaStream();
  const {
    players,
    setPlayers,
    playerHighlighted,
    nonHighlightedPlayers,
    toggleAudio,
    toggleVideo,
    leaveRoom,
  } = usePlayer(myId, roomId, peer, {
    toggleAudio: toggleStreamAudio,
    toggleVideo: toggleStreamVideo,
    isAudioEnabled,
    isVideoEnabled,
  });

  const [users, setUsers] = useState([]);
  const [callStartTime] = useState(() => Date.now());
  const [callDuration, setCallDuration] = useState(0);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isParticipantsOpen, setIsParticipantsOpen] = useState(false);

  // Room status and Host Approval state
  const [roomStatus, setRoomStatus] = useState("approved");
  const [isHost, setIsHost] = useState(false);
  const [pendingRequests, setPendingRequests] = useState([]);

  // Initialize Reactions & Hand Raise hooks
  const { activeReactions, sendReaction, EMOJIS } = useReactions(
    socket,
    roomId,
    myId
  );
  const { raisedHands, isHandRaised, toggleHandRaise } = useHandRaise(
    socket,
    roomId,
    myId
  );

  useEffect(() => {
    if (!socket) return;

    const handleStatusChanged = (info) => {
      if (info.status) {
        setRoomStatus((prevStatus) => {
          if (prevStatus === "waiting" && info.status === "approved") {
            showToast("Host approved your request! Joining call...", "success");
            if (roomId && myId) {
              socket.emit("join-room", roomId, myId);
            }
          } else if (info.status === "rejected") {
            showToast("Host declined your request to join", "error");
          }
          return info.status;
        });
      }
      if (info.isHost !== undefined) setIsHost(info.isHost);
    };

    const handlePendingUpdated = (requests) => {
      setPendingRequests(requests || []);
    };

    socket.on("room-status-changed", handleStatusChanged);
    socket.on("pending-requests-updated", handlePendingUpdated);

    if (socket.roomStatus) setRoomStatus(socket.roomStatus);
    if (socket.isHost !== undefined) setIsHost(socket.isHost);
    if (socket.pendingRequests) setPendingRequests(socket.pendingRequests);

    return () => {
      socket.off("room-status-changed", handleStatusChanged);
      socket.off("pending-requests-updated", handlePendingUpdated);
    };
  }, [socket, roomId, myId]);

  // Initialize screen share functionality
  const {
    isScreenSharing,
    activeScreenSharer,
    isAnotherSharing,
    toggleScreenShare,
  } = useScreenShare(myId, roomId, stream, users, setPlayers);

  // Initialize chat functionality
  const {
    messages,
    connectedPeers,
    isConnected: isChatConnected,
    sendMessage,
    cleanupPeerDataChannel,
  } = useChat(peer, myId, users);

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [callStartTime]);

  // Add yourself to players when stream is ready and status is approved
  useEffect(() => {
    if (!myId || !stream || roomStatus !== "approved") return;
    setPlayers((prev) => ({
      ...prev,
      [myId]: {
        url: stream,
        muted: true,
        playing: isVideoEnabled,
        audioEnabled: isAudioEnabled,
      },
    }));
  }, [myId, stream, roomStatus, isAudioEnabled, isVideoEnabled, setPlayers]);

  const retryMediaStream = async () => {
    if (process.env.NODE_ENV === "development") {
      const { quickAudioCheck } = await import("@/utils/audio-diagnostics");
      console.log("Running audio diagnostics before retry...");
      await quickAudioCheck();
    }
    window.location.reload();
  };

  useEffect(() => {
    if (!socket || !peer || !stream || roomStatus !== "approved") return;

    const handleUserConnected = (newUser) => {
      console.log(`user connected in room with userId ${newUser}`);
      const call = peer.call(newUser, stream);

      call.on("stream", (incomingStream) => {
        console.log(`incoming stream from ${newUser}`);
        setPlayers((prev) => ({
          ...prev,
          [newUser]: {
            url: incomingStream,
            muted: false,
            playing: true,
            audioEnabled: true,
          },
        }));

        setUsers((prev) => ({
          ...prev,
          [newUser]: call,
        }));
      });

      call.on("close", () => {
        console.log(`Outgoing call closed with ${newUser}`);
        setPlayers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[newUser];
          return copy;
        });

        setUsers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[newUser];
          return copy;
        });
      });

      call.on("error", (error) => {
        console.error(`Outgoing call error with ${newUser}:`, error);
        setPlayers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[newUser];
          return copy;
        });

        setUsers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[newUser];
          return copy;
        });
      });
    };

    socket.on("user-connected", handleUserConnected);

    return () => {
      socket.off("user-connected", handleUserConnected);
    };
  }, [peer, setPlayers, socket, stream, roomStatus]);

  useEffect(() => {
    if (!socket) return;

    const handleToggleAudio = (userId) => {
      setPlayers((prev) => {
        const copy = cloneDeep(prev);
        if (copy[userId]) {
          copy[userId].audioEnabled = !copy[userId].audioEnabled;
          copy[userId].muted = !copy[userId].audioEnabled;
        }
        return { ...copy };
      });
    };

    const handleToggleVideo = (userId) => {
      setPlayers((prev) => {
        const copy = cloneDeep(prev);
        if (copy[userId]) {
          copy[userId].playing = !copy[userId].playing;
        }
        return { ...copy };
      });
    };

    const handleUserLeave = (userId) => {
      cleanupPeerDataChannel(userId);

      if (users[userId]) {
        users[userId].close();
      }

      setPlayers((prev) => {
        const copy = cloneDeep(prev);
        delete copy[userId];
        return copy;
      });

      setUsers((prev) => {
        const copy = cloneDeep(prev);
        delete copy[userId];
        return copy;
      });
    };

    socket.on("user-toggle-audio", handleToggleAudio);
    socket.on("user-toggle-video", handleToggleVideo);
    socket.on("user-leave", handleUserLeave);

    return () => {
      socket.off("user-toggle-audio", handleToggleAudio);
      socket.off("user-toggle-video", handleToggleVideo);
      socket.off("user-leave", handleUserLeave);
    };
  }, [players, setPlayers, socket, users, cleanupPeerDataChannel]);

  useEffect(() => {
    if (!peer || !stream || roomStatus !== "approved") return;

    peer.on("call", (call) => {
      const { peer: callerId } = call;
      call.answer(stream);

      call.on("stream", (incomingStream) => {
        console.log(`incoming stream from ${callerId}`);
        setPlayers((prev) => ({
          ...prev,
          [callerId]: {
            url: incomingStream,
            muted: false,
            playing: true,
            audioEnabled: true,
          },
        }));

        setUsers((prev) => ({
          ...prev,
          [callerId]: call,
        }));
      });

      call.on("close", () => {
        setPlayers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[callerId];
          return copy;
        });

        setUsers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[callerId];
          return copy;
        });
      });

      call.on("error", (error) => {
        console.error(`Call error with ${callerId}:`, error);
        setPlayers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[callerId];
          return copy;
        });

        setUsers((prev) => {
          const copy = cloneDeep(prev);
          delete copy[callerId];
          return copy;
        });
      });
    });
  }, [peer, setPlayers, stream, roomStatus]);

  useEffect(() => {
    if (selectedAudioOutput && selectedAudioOutput !== "default") {
      const videoElements = document.querySelectorAll("video");
      videoElements.forEach((video) => {
        if (video.setSinkId) {
          video.setSinkId(selectedAudioOutput).catch((err) => {
            console.warn("Failed to set audio output device:", err);
          });
        }
      });
    }
  }, [selectedAudioOutput]);

  // Render Waiting Room for guests if not approved
  if (roomStatus === "waiting" || roomStatus === "rejected" || roomStatus === "full") {
    return (
      <>
        <ToastContainer />
        <WaitingRoom
          status={roomStatus}
          onLeave={leaveRoom}
        />
      </>
    );
  }

  return (
    <>
      <ToastContainer />
      {/* Permission Request Overlay */}
      {(mediaError || !permissions.audio || !permissions.video) && (
        <PermissionRequest
          error={mediaError}
          permissions={permissions}
          onRetry={retryMediaStream}
        />
      )}

      {/* Host Approval Banner for Pending Requests */}
      {isHost && (
        <HostApprovalBanner
          pendingRequests={pendingRequests}
          onApprove={(targetId) => socket?.emit("approve-user", targetId, roomId)}
          onReject={(targetId) => socket?.emit("reject-user", targetId, roomId)}
        />
      )}

      <SimpleCallLayout
        roomId={roomId}
        participants={Object.keys(players)}
        onShare={() => {
          if (navigator.clipboard) {
            navigator.clipboard.writeText(window.location.href);
          }
        }}
      >
        {/* Video Grid */}
        <div className="h-full p-2 sm:p-4 pb-16 sm:pb-20 overflow-hidden">
          <SimpleVideoGrid
            players={players}
            highlightedPlayerId={
              activeScreenSharer
                ? activeScreenSharer.userId
                : isScreenSharing
                ? myId
                : playerHighlighted
                ? Object.keys(players).find(
                    (id) => players[id] === playerHighlighted
                  )
                : null
            }
            onPlayerClick={(playerId) => {
              console.log(`Player ${playerId} clicked`);
            }}
            onRemoveUser={(targetId) => {
              socket?.emit("kick-user", targetId, roomId);
              showToast("Removed participant from call", "info");
            }}
            myId={myId}
            roomId={roomId}
            isHost={isHost}
            isAudioEnabled={isAudioEnabled}
            selectedAudioOutput={selectedAudioOutput}
            raisedHands={raisedHands}
            activeReactions={activeReactions}
            className="h-full"
          />
        </div>
      </SimpleCallLayout>

      {/* Floating Controls */}
      {myId && socket && (
        <FloatingControls
          muted={!isAudioEnabled}
          playing={isVideoEnabled}
          toggleAudio={toggleAudio}
          toggleVideo={toggleVideo}
          leaveRoom={leaveRoom}
          onToggleChat={() => setIsChatOpen((prev) => !prev)}
          onToggleParticipants={() => setIsParticipantsOpen((prev) => !prev)}
          participantCount={Object.keys(players).length}
          isChatOpen={isChatOpen}
          isParticipantsOpen={isParticipantsOpen}
          unreadCount={messages.length}
          isScreenSharing={isScreenSharing}
          toggleScreenShare={toggleScreenShare}
          isAnotherSharing={isAnotherSharing}
          activeScreenSharer={activeScreenSharer}
          onSendReaction={sendReaction}
          isHandRaised={isHandRaised}
          toggleHandRaise={toggleHandRaise}
          emojis={EMOJIS}
          callDuration={callDuration}
        />
      )}

      {/* Participants Drawer */}
      <ParticipantsDrawer
        isOpen={isParticipantsOpen}
        onToggle={setIsParticipantsOpen}
        participants={Object.keys(players)}
        userProfiles={socket?.userProfiles || {}}
        hostId={socket?.hostId}
        myId={myId}
        isHost={isHost}
        onRemoveUser={(targetId) => {
          socket?.emit("kick-user", targetId, roomId);
          showToast("Removed participant from call", "info");
        }}
      />

      {/* Chat Panel */}
      {myId && (
        <SimpleChat
          messages={messages}
          onSendMessage={sendMessage}
          isConnected={isChatConnected}
          connectedPeers={connectedPeers}
          userProfiles={socket?.userProfiles || {}}
          myId={myId}
          isOpen={isChatOpen}
          onToggle={setIsChatOpen}
        />
      )}
    </>
  );
};

export default Room;
