import { useState, useRef, useEffect } from "react";
import { Send, MessageCircle, X, Users, Lock } from "lucide-react";
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
  const [messageInput, setMessageInput] = useState("");
  const [recipientId, setRecipientId] = useState("everyone");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Focus input when chat opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 100);
    }
  }, [isOpen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() || !isConnected) return;

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
            Chat & Direct Messaging
          </SheetTitle>
          {isConnected && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Users size={10} />
              <span>{connectedPeers.length} online</span>
            </div>
          )}
        </SheetHeader>

        {/* Connection Status Banner */}
        {!isConnected && (
          <div className="px-4 py-2 text-xs text-muted-foreground text-center border-b bg-muted/50">
            Waiting for connection&hellip;
          </div>
        )}

        {/* Messages Container */}
        <ScrollArea className="flex-1 px-4 py-3 scrollbar-thin">
          {messages.length === 0 ? (
            <div className="text-center text-muted-foreground text-sm mt-8 space-y-2">
              <MessageCircle
                size={24}
                className="mx-auto opacity-40"
              />
              <p>No messages yet</p>
              <p className="text-xs opacity-70">Send a public or private message to start</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {messages.map((message) => (
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

        {/* Message Input & Recipient Selector */}
        <div className="border-t p-3 space-y-2">
          {/* Recipient Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground font-medium shrink-0">
              Send To:
            </span>
            <select
              value={recipientId}
              onChange={(e) => setRecipientId(e.target.value)}
              className="bg-muted text-foreground text-xs rounded-md px-2 py-1 border border-border focus:outline-none focus:ring-1 focus:ring-primary flex-1 font-medium cursor-pointer"
            >
              <option value="everyone">Everyone (Public)</option>
              {connectedPeers.map((peerId) => (
                <option key={peerId} value={peerId}>
                  🔒 {userProfiles[peerId] || `User ${peerId.slice(0, 4)}`} (Private)
                </option>
              ))}
            </select>
          </div>

          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              ref={inputRef}
              type="text"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                isConnected
                  ? recipientId === "everyone"
                    ? "Type a public message..."
                    : `Private message to ${userProfiles[recipientId] || "user"}...`
                  : "Connecting..."
              }
              disabled={!isConnected}
              maxLength={300}
              className="flex-1 text-sm h-9"
            />
            <Button
              type="submit"
              size="icon"
              disabled={!messageInput.trim() || !isConnected}
              className="h-9 w-9 shrink-0"
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
