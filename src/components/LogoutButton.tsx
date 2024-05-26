"use client";

import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";

function LogoutButton() {
    const supabase = createClient();
    const router = useRouter();

    const signOutHandler = async () => {
        const { error } = await supabase.auth.signOut();

        if (error) {
            console.error("Error logging out:", error.message);
        }
        router.replace("/login");
    };

    return <button onClick={signOutHandler}>Logout</button>;
}

export default LogoutButton;
