import type { Metadata } from "next";
import { Inter as FontSans, Bree_Serif as FontSerif } from "next/font/google";

import "./globals.css";

import { Analytics } from "@vercel/analytics/react";

import { cn } from "@/lib/utils";
import { Toaster } from "@/components/ui/toaster";
import Providers from "@/components/react-query/ReactQueryClientProvider";

const fontSans = FontSans({
    subsets: ["latin"],
    variable: "--font-sans",
});

const fontSerif = FontSerif<"--font-serif">({
    subsets: ["latin"],
    variable: "--font-serif",
    weight: "400",
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
                    "min-h-screen font-sans antialiased",
                    fontSans.variable,
                    fontSerif.variable
                )}
            >
                <Providers>{children} </Providers>
                <Toaster />
            </body>
            <Analytics />
        </html>
    );
}
