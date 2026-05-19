import { DM_Sans } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata = {
  title: "CleanCompress",
  description: "Image Compressor Extension",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${dmSans.variable}`}>
      <body style={{ fontFamily: 'var(--font-dm-sans), sans-serif' }}>{children}</body>
    </html>
  );
}
