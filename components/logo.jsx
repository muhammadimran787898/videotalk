import { Video, MessageSquare, Sparkles } from "lucide-react";

export const Logo = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: {
      iconBg: "w-8 h-8 rounded-lg",
      iconSize: 16,
      textSize: "text-base font-bold tracking-tight",
      sparkleSize: 10,
    },
    md: {
      iconBg: "w-10 h-10 rounded-xl",
      iconSize: 20,
      textSize: "text-xl font-bold tracking-tight",
      sparkleSize: 12,
    },
    lg: {
      iconBg: "w-14 h-14 rounded-2xl",
      iconSize: 28,
      textSize: "text-2xl sm:text-3xl font-extrabold tracking-tight",
      sparkleSize: 16,
    },
  };

  const current = sizeClasses[size] || sizeClasses.md;

  return (
    <div className={`flex items-center gap-2.5 select-none ${className}`}>
      {/* Glowing Logo Badge */}
      <div
        className={`relative ${current.iconBg} bg-gradient-to-tr from-indigo-600 via-violet-600 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 ring-1 ring-white/20 overflow-hidden shrink-0 group`}
      >
        {/* Subtle inner sheen */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />

        <Video size={current.iconSize} className="relative z-10 drop-shadow-sm" />

        <div className="absolute -bottom-0.5 -right-0.5 bg-emerald-500 text-white p-0.5 rounded-full border border-background">
          <Sparkles size={current.sparkleSize} />
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col">
        <span className={`${current.textSize} bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent`}>
          Let&apos;s <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 bg-clip-text text-transparent">Talk</span>
        </span>
      </div>
    </div>
  );
};

export default Logo;
