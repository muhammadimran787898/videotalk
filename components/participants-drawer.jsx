import { useState } from "react";
import { Users, Crown, Mic, MicOff, UserX, Search, ShieldCheck } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const ParticipantsDrawer = ({
  isOpen = false,
  onToggle,
  participants = [],
  userProfiles = {},
  hostId,
  myId,
  isHost = false,
  onRemoveUser,
}) => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredParticipants = participants.filter((id) => {
    const name = userProfiles[id] || (id === myId ? "You" : `User ${id.slice(0, 4)}`);
    return name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <Sheet open={isOpen} onOpenChange={onToggle}>
      <SheetContent
        side="right"
        className="w-full sm:w-80 md:w-96 p-0 flex flex-col [&>button]:absolute [&>button]:right-4 [&>button]:top-3 [&>button]:z-10"
      >
        <SheetHeader className="px-4 py-3 border-b space-y-1.5">
          <SheetTitle className="flex items-center gap-2 text-sm font-medium">
            <Users size={16} />
            Participants ({participants.length})
          </SheetTitle>
        </SheetHeader>

        {/* Search Input */}
        <div className="p-3 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search participants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs h-9"
            />
          </div>
        </div>

        {/* Participants List */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5 scrollbar-thin">
          {filteredParticipants.map((id) => {
            const isMe = id === myId;
            const isParticipantHost = id === hostId;
            const name = userProfiles[id] || (isMe ? "You" : `User ${id.slice(0, 4)}`);

            return (
              <div
                key={id}
                className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/60 transition-colors"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="text-xs font-semibold">
                      {(name?.slice(0, 2) || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex flex-col overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-medium text-foreground truncate">
                        {name}
                      </span>
                      {isMe && (
                        <span className="text-[10px] text-muted-foreground font-normal">
                          (You)
                        </span>
                      )}
                    </div>

                    {isParticipantHost && (
                      <div className="flex items-center gap-1 text-[10px] text-amber-500 font-medium">
                        <Crown size={10} />
                        <span>Host</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Host Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  {isHost && !isMe && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onRemoveUser?.(id)}
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      title="Remove participant"
                    >
                      <UserX size={14} />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default ParticipantsDrawer;
