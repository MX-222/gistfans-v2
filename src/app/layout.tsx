import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

// 临时禁用Google字体以修复加载错误
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
// });

// const geistMono = Geist_Mono({
//   variable: "--font-geist-mono",
//   subsets: ["latin"],
// });

export const metadata: Metadata = {
  title: "GistFans - Connect with Expert Developers",
  description: "Developer subscription platform connecting experienced open source contributors with programming beginners.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="font-sans antialiased"
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
