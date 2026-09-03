import React from "react";

export const LogoIcon = ({ className = "w-8 h-8", ...props }) => (
  <svg
    viewBox="0 0 300 240"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    {...props}
  >
    {/* Left Sky Blue Circle */}
    <circle cx="115" cy="105" r="72" fill="#38B6FF" />

    {/* Right Teal Speech Bubble */}
    <path
      d="M175 33C135.235 33 103 65.235 103 105C103 121.5 108.6 136.7 118 148.8L112 188L151.2 178C158.8 181.8 167.3 184 176.3 184C216.065 184 248.3 151.765 248.3 112C248.3 72.2354 216.065 33 175 33Z"
      fill="#29C4A9"
    />

    {/* Dark Navy Overlap Zone */}
    <path
      d="M175 33C155.3 33 137.4 40.9 124.5 53.7C137.9 67.8 146 86.8 146 107.7C146 128.6 137.9 147.6 124.5 161.7C137.4 174.5 155.3 182.4 175 182.4C216.065 182.4 248.3 150.165 248.3 110.4C248.3 70.6354 216.065 33 175 33Z"
      fill="#0B2545"
      opacity="0.9"
    />

    {/* 3 White Dots in Overlap */}
    <circle cx="138" cy="104" r="7.5" fill="#FFFFFF" />
    <circle cx="160" cy="104" r="7.5" fill="#FFFFFF" />
    <circle cx="182" cy="104" r="7.5" fill="#FFFFFF" />
  </svg>
);

export const Logo = ({ size = "md", showText = true, className = "" }) => {
  const sizeMap = {
    sm: { icon: "w-7 h-7 sm:w-8 sm:h-8", text: "text-base font-extrabold tracking-tight" },
    md: { icon: "w-9 h-9 sm:w-11 sm:h-11", text: "text-xl sm:text-2xl font-extrabold tracking-tight" },
    lg: { icon: "w-14 h-14 sm:w-20 sm:h-20", text: "text-3xl sm:text-4xl font-black tracking-tight" },
  };

  const current = sizeMap[size] || sizeMap.md;

  return (
    <div className={`flex items-center gap-2 select-none ${className}`}>
      <LogoIcon className={`${current.icon} shrink-0 drop-shadow-sm`} />
      {showText && (
        <span className={`${current.text} font-sans tracking-tight`}>
          <span className="text-[#38B6FF]">Let&apos;s </span>
          <span className="text-[#29C4A9]">Talk</span>
        </span>
      )}
    </div>
  );
};

export default Logo;
