import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X, Users, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const SimpleChat = ({
  messages = [],
  onSendMessage,
  isConnected = false,
  connectedPeers = [],
  userProfiles = {},
  myId,
  isOpen = false,
  onToggle,
  className = "",
}) => {
  const [activeTab, setActiveTab] = useState("public"); // "public" | "private"
  const [messageInput, setMessageInput] = useState("");
  const [privateRecipientId, setPrivateRecipientId] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Set default private recipient to first connected peer if available
  useEffect(() => {
    if (connectedPeers.length > 0 && !privateRecipientId) {
      setPrivateRecipientId(connectedPeers[0]);
    }
  }, [connectedPeers, privateRecipientId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Filter messages based on active tab and private recipient
  const visibleMessages = messages.filter((m) => {
    if (activeTab === "public") {
      return !m.isPrivate; // STRICTLY PUBLIC MESSAGES ONLY
    }
    // Private tab: only private messages involving selected recipient
    if (!m.isPrivate) return false;
    if (!privateRecipientId) return true; // Show all private messages if no recipient selected yet
    return (
      m.senderId === privateRecipientId ||
      m.recipientId === privateRecipientId ||
      (m.isOwn && m.recipientId === privateRecipientId)
    );
  });

  // Auto-scroll to bottom when new visible messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [visibleMessages.length, activeTab, privateRecipientId]);

  // Focus input when chat opens or tab changes
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen, activeTab]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !isConnected) return;

    const recipientId = activeTab === "public" ? "everyone" : privateRecipientId;
    if (activeTab === "private" && !recipientId) return;

    const selectedName =
      recipientId === "everyone"
        ? "Everyone"
        : userProfiles[recipientId] || `User ${recipientId.slice(0, 4)}`;

    const success = onSendMessage(messageInput, recipientId, selectedName);
    if (success !== false) {
      setMessageInput("");
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent
        side="right"
        className="w-full sm:w-80 md:w-96 p-0 flex flex-col [&>button]:absolute [&>button]:right-4 [&>button]:top-3 [&>button]:z-10"
      >
        {/* Chat Header */}
        <SheetHeader className="px-4 py-3 border-b space-y-1.5">
          <SheetTitle className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle size={16} />
            In-Call Messaging
          </SheetTitle>
          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={10} />
              <span>{connectedPeers.length} online</span>
            </div>
          )}
        </SheetHeader>

        {/* Public / Private Tab Switcher */}
        <div className="flex border-b bg-muted/30 p-1.5 gap-1">
          <button
            onClick={() => setActiveTab("public")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "public"
                ? "bg-background text-foreground shadow-sm font-semibold border border-border"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Globe size={13} className="text-blue-500" />
            <span>Public Chat</span>
          </button>

          <button
            onClick={() => setActiveTab("private")}
            className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
              activeTab === "private"
                ? "bg-amber-950/40 text-amber-300 shadow-sm font-semibold border border-amber-500/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <Lock size={13} className="text-amber-400" />
            <span>Private Chat</span>
          </button>
        </div>

        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="px-4 py-2 text-xs text-muted-foreground text-center border-b bg-muted/50">
            Waiting for connection&hellip;
          </div>
        )}

        {/* Private Recipient Filter Dropdown (Only in Private Tab) */}
        {activeTab === "private" && (
          <div className="px-3 py-2 border-b bg-amber-950/20 flex items-center gap-2">
            <span className="text-[11px] text-amber-200 font-medium shrink-0">
              Private with:
            </span>
            <select
              value={privateRecipientId}
              onChange={(e) => setPrivateRecipientId(e.target.value)}
              className="bg-background text-foreground text-xs rounded-md px-2 py-1 border border-amber-500/40 focus:outline-none focus:ring-1 focus:ring-amber-500 flex-1 font-medium cursor-pointer"
            >
              {connectedPeers.length === 0 ? (
                <option value="">No other participants online</option>
              ) : (
                connectedPeers.map((peerId) => (
                  <option key={peerId} value={peerId}>
                    🔒 {userProfiles[peerId] || `User ${peerId.slice(0, 4)}`}
                  </option>
                ))
              )}
            </select>
          </div>
        )}

        {/* Messages Container */}
        <ScrollArea className="flex-1 px-4 py-3 scrollbar-thin">
          {visibleMessages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm mt-8 space-y-2">
              {activeTab === "public" ? (
                <>
                  <Globe size={24} className="mx-auto opacity-40 text-blue-500" />
                  <p className="font-medium text-foreground">No public messages</p>
                  <p className="text-xs opacity-70">Messages sent here are visible to everyone in the call.</p>
                </>
              ) : (
                <>
                  <Lock size={24} className="mx-auto opacity-40 text-amber-400" />
                  <p className="font-medium text-foreground">No private messages</p>
                  <p className="text-xs opacity-70">
                    {connectedPeers.length === 0
                      ? "Wait for another participant to join to send private messages."
                      : "Send encrypted direct messages that only you and the recipient can see."}
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {visibleMessages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.isOwn ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      message.isOwn
                        ? message.isPrivate
                          ? "bg-amber-600 text-white rounded-br-sm shadow-sm"
                          : "bg-primary text-primary-foreground rounded-br-sm"
                        : message.isPrivate
                        ? "bg-amber-950/40 text-amber-100 rounded-bl-sm border border-amber-500/40 shadow-sm"
                        : "bg-secondary text-secondary-foreground rounded-bl-sm border border-border"
                    }`}
                  >
                    {/* Header info / Private badge */}
                    <div className="flex items-center gap-1.5 mb-1 text-[10px] opacity-80 font-medium">
                      {!message.isOwn && (
                        <span>{message.senderName}</span>
                      )}
                      {message.isPrivate && (
                        <Badge
                          variant="outline"
                          className="gap-0.5 text-[9px] px-1 py-0 border-current font-normal text-amber-200"
                        >
                          <Lock size={9} />
                          {message.isOwn
                            ? `Private to ${message.recipientName}`
                            : `Private message`}
                        </Badge>
                      )}
                    </div>

                    <div className="break-words">{message.text}</div>
                    <div
                      className={`text-[10px] mt-1 opacity-60 text-right ${
                        message.isOwn
                          ? "text-primary-foreground/80"
                          : "text-muted-foreground"
                      }`}
                    >
                      {formatTimestamp(message.timestamp)}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input Container */}
        <div className="border-t p-3 space-y-2 bg-card">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                !isConnected
                  ? "Connecting..."
                  : activeTab === "public"
                  ? "Type a public message to everyone..."
                  : privateRecipientId
                  ? `Private message to ${userProfiles[privateRecipientId] || "user"}...`
                  : "Select a participant for private chat..."
              }
              disabled={!isConnected || (activeTab === "private" && !privateRecipientId)}
              maxLength={300}
              className="flex-1 text-sm h-9"
            />
            <Button
              type="submit"
              size="icon"
              disabled={
                !messageInput.trim() ||
                !isConnected ||
                (activeTab === "private" && !privateRecipientId)
              }
              className={`h-9 w-9 shrink-0 ${
                activeTab === "private" ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
              }`}
            >
              <Send size={14} />
            </Button>
          </form>
          {messageInput.length > 250 && (
            <p className="text-xs text-muted-foreground mt-1">
              {300 - messageInput.length} characters left
            </p>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default SimpleChat;
