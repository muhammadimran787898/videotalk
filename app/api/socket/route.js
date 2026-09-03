const MAX_ROOM_USERS = 12;

// In-memory store for local dev fallback
const rooms = new Map();
const userSessions = new Map();
const screenSharers = new Map();

// Upstash / Vercel KV REST Execution Helper for Serverless Persistence
async function redisRest(command, ...args) {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

  if (!url || !token) return null;

  try {
    const formattedArgs = args.map((arg) => encodeURIComponent(String(arg))).join("/");
    const res = await fetch(`${url}/${command}/${formattedArgs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.result;
  } catch (err) {
    console.error("Upstash Redis REST Error:", err);
    return null;
  }
}

async function getRoomData(roomId) {
  const redisData = await redisRest("get", `roomstate:${roomId}`);
  if (redisData) {
    try {
      return JSON.parse(redisData);
    } catch (e) {}
  }
  return rooms.get(roomId) || { hostId: null, users: [], pending: [], rejected: [] };
}

async function saveRoomData(roomId, data) {
  await redisRest("set", `roomstate:${roomId}`, JSON.stringify(data));
  await redisRest("expire", `roomstate:${roomId}`, 7200);
  rooms.set(roomId, data);
}

async function removeRoomData(roomId) {
  await redisRest("del", `roomstate:${roomId}`);
  rooms.delete(roomId);
}

async function removeRoomUser(roomId, userId) {
  const room = await getRoomData(roomId);
  room.users = room.users.filter((u) => u.id !== userId);
  room.pending = room.pending.filter((u) => u.id !== userId);

  if (room.hostId === userId) {
    room.hostId = room.users.length > 0 ? room.users[0].id : null;
  }

  if (room.users.length === 0 && room.pending.length === 0) {
    await removeRoomData(roomId);
  } else {
    await saveRoomData(roomId, room);
  }

  // Clear screen sharer if leaving user was sharing
  const currentSharer = await getScreenSharer(roomId);
  if (currentSharer && currentSharer.userId === userId) {
    await clearScreenSharer(roomId);
  }
}

async function getScreenSharer(roomId) {
  const redisData = await redisRest("get", `screenshare:${roomId}`);
  if (redisData) {
    try {
      return JSON.parse(redisData);
    } catch (e) {}
  }
  return screenSharers.get(roomId) || null;
}

async function setScreenSharer(roomId, sharerObj) {
  await redisRest("set", `screenshare:${roomId}`, JSON.stringify(sharerObj));
  screenSharers.set(roomId, sharerObj);
}

async function clearScreenSharer(roomId) {
  await redisRest("del", `screenshare:${roomId}`);
  screenSharers.delete(roomId);
}

// Clean up old local sessions (older than 5 minutes)
const cleanupOldSessions = () => {
  const now = Date.now();
  const fiveMinutes = 5 * 60 * 1000;

  for (const [sessionId, session] of userSessions.entries()) {
    if (now - session.lastSeen > fiveMinutes) {
      if (session.roomId) {
        removeRoomUser(session.roomId, session.userId);
      }
      userSessions.delete(sessionId);
    }
  }
};

setInterval(cleanupOldSessions, 60000);

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");
  const roomId = searchParams.get("roomId");
  const userId = searchParams.get("userId");
  const userName = searchParams.get("userName") || userId;
  const sessionId = searchParams.get("sessionId");

  try {
    switch (action) {
      case "join-room": {
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        const room = await getRoomData(roomId);
        const newSessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;

        userSessions.set(newSessionId, {
          userId,
          userName,
          roomId,
          lastSeen: Date.now(),
        });

        // 1. Check if room is full (max 12 users)
        if (room.users.length >= MAX_ROOM_USERS && !room.users.some((u) => u.id === userId)) {
          return Response.json({
            success: false,
            isFull: true,
            error: `Room is full. Maximum ${MAX_ROOM_USERS} participants allowed.`,
          });
        }

        // 2. Check if user was rejected
        if (room.rejected.includes(userId)) {
          return Response.json({
            success: false,
            isRejected: true,
            status: "rejected",
            error: "Host declined your request to join this call.",
          });
        }

        // 3. First user becomes Host automatically
        if (!room.hostId || room.users.length === 0) {
          room.hostId = userId;
        }

        const isHost = room.hostId === userId;
        const alreadyApproved = room.users.some((u) => u.id === userId);

        if (isHost || alreadyApproved) {
          const userObj = {
            id: userId,
            name: userName,
            sessionId: newSessionId,
            joinedAt: Date.now(),
          };

          const existingIdx = room.users.findIndex((u) => u.id === userId);
          if (existingIdx >= 0) {
            room.users[existingIdx] = userObj;
          } else {
            room.users.push(userObj);
          }

          // Remove from pending if present
          room.pending = room.pending.filter((u) => u.id !== userId);
          await saveRoomData(roomId, room);

          const activeSharer = await getScreenSharer(roomId);

          return Response.json({
            success: true,
            status: "approved",
            isHost,
            sessionId: newSessionId,
            roomUsers: room.users.map((u) => u.id),
            userProfiles: room.users.reduce((acc, u) => {
              acc[u.id] = u.name;
              return acc;
            }, {}),
            pendingRequests: isHost ? room.pending : [],
            activeScreenSharer: activeSharer,
          });
        }

        // 4. Guest joining -> put in pending / waiting room
        const existingPending = room.pending.find((u) => u.id === userId);
        if (!existingPending) {
          room.pending.push({
            id: userId,
            name: userName,
            requestedAt: Date.now(),
          });
          await saveRoomData(roomId, room);
        }

        return Response.json({
          success: true,
          isWaiting: true,
          status: "waiting",
          message: "Waiting for host approval...",
        });
      }

      case "get-room-users": {
        if (!roomId) {
          return Response.json({ error: "Missing roomId" }, { status: 400 });
        }

        const room = await getRoomData(roomId);
        const isUserApproved = room.users.some((u) => u.id === userId);
        const isUserPending = room.pending.some((u) => u.id === userId);
        const isUserRejected = room.rejected.includes(userId);
        const isHost = room.hostId === userId;

        const currentActiveSharer = await getScreenSharer(roomId);

        return Response.json({
          status: isUserApproved
            ? "approved"
            : isUserRejected
            ? "rejected"
            : isUserPending
            ? "waiting"
            : "unknown",
          hostId: room.hostId,
          isHost,
          users: room.users.map((u) => u.id),
          userProfiles: room.users.reduce((acc, u) => {
            acc[u.id] = u.name;
            return acc;
          }, {}),
          pendingRequests: isHost ? room.pending : [],
          activeScreenSharer: currentActiveSharer,
        });
      }

      case "leave-room": {
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        await removeRoomUser(roomId, userId);

        for (const [id, session] of userSessions.entries()) {
          if (session.userId === userId && session.roomId === roomId) {
            userSessions.delete(id);
            break;
          }
        }

        return Response.json({ success: true });
      }

      case "ping": {
        if (sessionId) {
          const session = userSessions.get(sessionId);
          if (session) {
            session.lastSeen = Date.now();
            return Response.json({ success: true });
          }
        }
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { action, roomId, userId, targetUserId, userName } = body;

    switch (action) {
      case "approve-user": {
        if (!roomId || !targetUserId) {
          return Response.json(
            { error: "Missing roomId or targetUserId" },
            { status: 400 }
          );
        }

        const room = await getRoomData(roomId);
        const pendingUser = room.pending.find((u) => u.id === targetUserId);
        
        if (pendingUser) {
          room.pending = room.pending.filter((u) => u.id !== targetUserId);
          if (!room.users.some((u) => u.id === targetUserId)) {
            room.users.push({
              id: pendingUser.id,
              name: pendingUser.name,
              joinedAt: Date.now(),
            });
          }
          await saveRoomData(roomId, room);
        }

        return Response.json({ success: true });
      }

      case "reject-user": {
        if (!roomId || !targetUserId) {
          return Response.json(
            { error: "Missing roomId or targetUserId" },
            { status: 400 }
          );
        }

        const room = await getRoomData(roomId);
        room.pending = room.pending.filter((u) => u.id !== targetUserId);
        if (!room.rejected.includes(targetUserId)) {
          room.rejected.push(targetUserId);
        }
        await saveRoomData(roomId, room);

        return Response.json({ success: true });
      }

      case "start-screen-share": {
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        const existingSharer = await getScreenSharer(roomId);
        if (existingSharer && existingSharer.userId !== userId) {
          return Response.json({
            success: false,
            error: "Another user is already sharing their screen",
            activeScreenSharer: existingSharer,
          });
        }

        const sharerInfo = {
          userId,
          userName: userName || userId,
          startedAt: Date.now(),
        };
        await setScreenSharer(roomId, sharerInfo);

        return Response.json({
          success: true,
          activeScreenSharer: sharerInfo,
        });
      }

      case "stop-screen-share": {
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        const activeSharerToStop = await getScreenSharer(roomId);
        if (activeSharerToStop && activeSharerToStop.userId === userId) {
          await clearScreenSharer(roomId);
        }

        return Response.json({
          success: true,
        });
      }

      case "toggle-audio":
      case "toggle-video": {
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        const room = await getRoomData(roomId);
        const otherUsers = room.users.filter((user) => user.id !== userId);

        return Response.json({
          success: true,
          event: `user-${action}`,
          targetUserId: userId,
          affectedUsers: otherUsers.map((u) => u.id),
        });
      }

      case "ping": {
        const { sessionId } = body;
        if (sessionId) {
          const session = userSessions.get(sessionId);
          if (session) {
            session.lastSeen = Date.now();
            return Response.json({ success: true });
          }
        }
        return Response.json({ error: "Session not found" }, { status: 404 });
      }

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

