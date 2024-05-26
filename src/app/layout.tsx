import type { Metadata } from "next";
import { Inter as FontSans } from "next/font/google";

import "./globals.css";

import { Analytics } from "@vercel/analytics/react";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import Providers from "@/components/react-query/ReactQueryClientProvider";

const fontSans = FontSans({
    subsets: ["latin"],
    variable: "--font-sans",
});

export const metadata: Metadata = {
    title: "Encontre seu Pet Canoas RS",
    description: "",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={cn(
                    "min-h-screen bg-violet-100 font-sans antialiased",
                    fontSans.variable
                )}
            >
                <Providers>{children} </Providers>
                <Toaster />
            </body>
            <Analytics />
        </html>
    );
}
