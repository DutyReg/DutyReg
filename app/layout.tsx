import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { DARK_THEME_COLOR, LIGHT_THEME_COLOR, THEME_STORAGE_KEY } from "@/lib/theme";
import { ProgressProvider } from "@/components/progress-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DutyReg — duty registry made simple",
    template: "%s · DutyReg",
  },
  description:
    "Simple attendance logging for small businesses. Supervisors mark the day, owners see it instantly.",
  applicationName: "DutyReg",
  icons: {
    icon: '/icons/webicon.png',
    shortcut: '/icons/webicon.png',
    apple: '/icons/webicon.png',
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: LIGHT_THEME_COLOR },
    { media: "(prefers-color-scheme: dark)", color: DARK_THEME_COLOR },
  ],
};

const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var stored=localStorage.getItem(k);var dark=stored?stored==="dark":window.matchMedia("(prefers-color-scheme: dark)").matches;var el=document.documentElement;el.classList.toggle("dark",dark);el.style.colorScheme=dark?"dark":"light";}catch(e){}})();`;

const progressInitScript = `(function(){try{var circle=document.querySelector('#nprogress circle');if(!circle)return;var start=performance.now();function tick(){var p=Math.min(100,Math.round((performance.now()-start)/30));circle.style.strokeDashoffset=100*(1-p/100);if(p<100)requestAnimationFrame(tick);else document.getElementById('nprogress').classList.add('done');}requestAnimationFrame(tick);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-dvh">
        <svg id="nprogress" viewBox="0 0 40 40" aria-hidden="true">
          <circle cx="20" cy="20" r="15.915" />
        </svg>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitScript }}
        />
        <script
          dangerouslySetInnerHTML={{ __html: progressInitScript }}
        />
        <ProgressProvider>
          {children}
        </ProgressProvider>
      </body>
    </html>
  );
}