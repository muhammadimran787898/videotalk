import { UserCheck, UserX, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { showToast } from "@/components/toast-notification";

const HostApprovalBanner = ({ pendingRequests = [], onApprove, onReject }) => {
  if (!pendingRequests || pendingRequests.length === 0) return null;

  const handleApprove = (req) => {
    onApprove(req.id);
    showToast(`Allowed ${req.name || "User"} to join the call`, "success");
  };

  const handleReject = (req) => {
    onReject(req.id);
    showToast(`Declined request from ${req.name || "User"}`, "error");
  };

  return (
    <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-3 animate-fade-in">
      <div className="bg-card border border-border/80 shadow-2xl rounded-xl p-3 flex flex-col gap-2.5 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="gap-1.5 px-2 py-0.5 text-xs font-medium">
              <UserPlus size={12} className="text-primary animate-pulse" />
              <span>Join Request</span>
            </Badge>
            <span className="text-xs text-muted-foreground">
              {pendingRequests.length} waiting
            </span>
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-2">
          {pendingRequests.map((req) => (
            <div
              key={req.id}
              className="flex items-center justify-between bg-muted/50 rounded-lg p-2 gap-3"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                  {(req.name?.slice(0, 2) || "U").toUpperCase()}
                </div>
                <span className="text-sm font-medium text-foreground truncate">
                  {req.name || `User ${req.id.slice(0, 4)}`}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleApprove(req)}
                  className="h-8 px-2.5 text-xs gap-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <UserCheck size={13} />
                  Allow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(req)}
                  className="h-8 px-2.5 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <UserX size={13} />
                  Decline
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HostApprovalBanner;
