import { Clock, ShieldAlert, UserX, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import Logo from "@/components/logo";

const WaitingRoom = ({ status, errorMessage, onLeave }) => {
  const isRejected = status === "rejected";
  const isFull = status === "full";

  return (
    <div className="relative min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Subtle background glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(var(--muted)/0.2)_0%,transparent_70%)] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm mx-auto text-center space-y-6 animate-fade-in">
        {/* Brand Logo Header */}
        <div className="flex justify-center mb-2">
          <Logo size="md" />
        </div>

        {/* Icon Header */}
        <div className="flex justify-center">
          <Avatar className="w-16 h-16 border-2 border-border shadow-lg">
            <AvatarFallback className={isRejected || isFull ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}>
              {isRejected ? (
                <UserX size={28} />
              ) : isFull ? (
                <Users size={28} />
              ) : (
                <Clock size={28} className="animate-spin" />
              )}
            </AvatarFallback>
          </Avatar>
        </div>

        {/* Status Text */}
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-foreground">
            {isRejected
              ? "Request Declined"
              : isFull
              ? "Room Full"
              : "Waiting Room"}
          </h2>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            {isRejected
              ? "The host declined your request to join this video call."
              : isFull
              ? "This room has reached the maximum limit of 12 participants."
              : "Waiting for the host to allow you into the video call..."}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Button variant="outline" onClick={onLeave} className="h-10 px-6 text-sm">
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WaitingRoom;
