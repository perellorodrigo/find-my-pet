"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

type FormArgs = {
    email: string;
    password: string;
};

export async function login({ email, password }: FormArgs) {
    const supabase = createClient();

    const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return {
            error: error.message,
            code: error.code,
            name: error.name,
        };
    }

    revalidatePath("/admin/batch-upload", "page");
    redirect("/admin/batch-upload");
}

export async function signup({
    email,
    password,
}: {
    email: string;
    password: string;
}) {
    const supabase = createClient();

    const { error, data } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return {
            error: error.message,
            code: error.code,
            name: error.name,
        };
    }

    revalidatePath("/", "layout");
    redirect("/");
}
