"server only";

import { UserResponse } from "@supabase/supabase-js";

import { createClient } from "./server";

const ADMIN_EMAILS = process.env.ADMIN_EMAILS;

async function verifyAdmin(user?: UserResponse) {
    if (!ADMIN_EMAILS) {
        console.error("No ADMIN_EMAILS provided.");
        return false;
    }

    const { error, data } = user || (await createClient().auth.getUser());

    if (error || !data.user.email) {
        return false;
    }

    return ADMIN_EMAILS.split(",").includes(data.user.email);
}

export { verifyAdmin };
