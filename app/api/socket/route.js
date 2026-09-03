import { NextRequest } from "next/server";

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

// Room management helpers
async function addRoomUser(roomId, user) {
  const redisResult = await redisRest(
    "hset",
    `room:${roomId}`,
    user.id,
    JSON.stringify(user)
  );
  if (redisResult !== null) {
    await redisRest("expire", `room:${roomId}`, 7200);
  }

  // Always update local map as well
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: [] });
  }
  const room = rooms.get(roomId);
  const existingIdx = room.users.findIndex((u) => u.id === user.id);
  if (existingIdx >= 0) {
    room.users[existingIdx] = user;
  } else {
    room.users.push(user);
  }
}

async function getRoomUsers(roomId) {
  // Try Redis first for serverless multi-instance sync
  const hashResult = await redisRest("hgetall", `room:${roomId}`);
  if (hashResult && Array.isArray(hashResult) && hashResult.length > 0) {
    const usersList = [];
    for (let i = 1; i < hashResult.length; i += 2) {
      try {
        usersList.push(JSON.parse(hashResult[i]));
      } catch (e) {
        // ignore parse error
      }
    }
    if (usersList.length > 0) return usersList;
  }

  // Fallback to local map
  const roomData = rooms.get(roomId);
  return roomData ? roomData.users : [];
}

async function removeRoomUser(roomId, userId) {
  await redisRest("hdel", `room:${roomId}`, userId);

  if (rooms.has(roomId)) {
    const room = rooms.get(roomId);
    room.users = room.users.filter((user) => user.id !== userId);
    if (room.users.length === 0) {
      rooms.delete(roomId);
    }
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
      case "join-room":
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        const newSessionId = `session_${Date.now()}_${Math.random()
          .toString(36)
          .substr(2, 9)}`;
        
        userSessions.set(newSessionId, {
          userId,
          userName,
          roomId,
          lastSeen: Date.now(),
        });

        const userObj = {
          id: userId,
          name: userName,
          sessionId: newSessionId,
          joinedAt: Date.now(),
        };

        await addRoomUser(roomId, userObj);
        const currentUsers = await getRoomUsers(roomId);
        const activeSharer = await getScreenSharer(roomId);

        return Response.json({
          success: true,
          sessionId: newSessionId,
          roomUsers: currentUsers.map((u) => u.id),
          userProfiles: currentUsers.reduce((acc, u) => {
            acc[u.id] = u.name;
            return acc;
          }, {}),
          activeScreenSharer: activeSharer,
        });

      case "get-room-users":
        if (!roomId) {
          return Response.json({ error: "Missing roomId" }, { status: 400 });
        }

        const roomUsersList = await getRoomUsers(roomId);
        const currentActiveSharer = await getScreenSharer(roomId);
        return Response.json({
          users: roomUsersList.map((u) => u.id),
          userProfiles: roomUsersList.reduce((acc, u) => {
            acc[u.id] = u.name;
            return acc;
          }, {}),
          activeScreenSharer: currentActiveSharer,
        });

      case "leave-room":
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

      case "ping":
        if (sessionId) {
          const session = userSessions.get(sessionId);
          if (session) {
            session.lastSeen = Date.now();
            return Response.json({ success: true });
          }
        }
        return Response.json({ error: "Session not found" }, { status: 404 });

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
    const { action, roomId, userId, userName } = body;

    switch (action) {
      case "start-screen-share":
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

      case "stop-screen-share":
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

      case "toggle-audio":
      case "toggle-video":
        if (!roomId || !userId) {
          return Response.json(
            { error: "Missing roomId or userId" },
            { status: 400 }
          );
        }

        const roomUsers = await getRoomUsers(roomId);
        const otherUsers = roomUsers.filter((user) => user.id !== userId);

        return Response.json({
          success: true,
          event: `user-${action}`,
          targetUserId: userId,
          affectedUsers: otherUsers.map((u) => u.id),
        });

      case "ping":
        const { sessionId } = body;
        if (sessionId) {
          const session = userSessions.get(sessionId);
          if (session) {
            session.lastSeen = Date.now();
            return Response.json({ success: true });
          }
        }
        return Response.json({ error: "Session not found" }, { status: 404 });

      default:
        return Response.json({ error: "Invalid action" }, { status: 400 });
    }
  } catch (error) {
    console.error("API Error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

