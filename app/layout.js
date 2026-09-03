import "./globals.css";
import { SocketProviderWrapper } from "./providers";

export const metadata = {
  title: "Let's Talk — Private HD Video Calls & Direct Messaging",
  description: "Instant, secure HD video calls and direct messaging with no sign-up required.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body>
        <SocketProviderWrapper>{children}</SocketProviderWrapper>
      </body>
    </html>
  );
}
