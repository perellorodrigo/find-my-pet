import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { verifyAdmin } from "@/lib/supabase/verify-admin";
import { cn } from "@/lib/utils";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import LoginOrSignUpForm from "@/components/LoginOrSignUpForm";

import { login, signup } from "./actions";

export default async function LoginPage() {
    const supabase = createClient();
    const userResponse = await supabase.auth.getUser();

    if (userResponse.data.user) {
        const redirectUrl = (await verifyAdmin(userResponse))
            ? "/admin/batch-upload"
            : "/";

        return redirect(redirectUrl);
    }

    return (
        <div
            className={cn(
                "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col justify-center"
            )}
        >
            <Tabs defaultValue="login" className="w-[400px]">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="login">Login</TabsTrigger>
                    <TabsTrigger value="signup">Sign up</TabsTrigger>
                </TabsList>
                <TabsContent value="login">
                    <Card>
                        <CardHeader>
                            <CardTitle>Login</CardTitle>
                            <CardDescription>
                                Entre aqui com sua conta.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LoginOrSignUpForm onSubmit={login} />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="signup">
                    <Card>
                        <CardHeader>
                            <CardTitle>Sign up</CardTitle>
                            <CardDescription>Crie sua conta</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <LoginOrSignUpForm onSubmit={signup} />
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
