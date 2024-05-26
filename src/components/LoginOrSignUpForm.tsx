"use client";

import { PropsWithChildren, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const LoginSchema = z.object({
    email: z.string().min(1),
    password: z.string().min(1),
});

type FormValues = z.infer<typeof LoginSchema>;

function FieldWithLabel({
    children,
    label,
}: PropsWithChildren<{
    label: string;
}>) {
    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>{children}</FormControl>
            <FormMessage />
        </FormItem>
    );
}

export default function LoginOrSignUpForm({
    onSubmit,
}: {
    onSubmit: (formValues: FormValues) => Promise<{
        error: string;
    } | void>;
}) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const form = useForm({
        resolver: zodResolver(LoginSchema),
        defaultValues: {
            email: "",
            password: "",
        },
    });

    const handleSubmit = async (formValues: FormValues) => {
        setIsSubmitting(true);
        const error = await onSubmit(formValues).finally(() =>
            setIsSubmitting(false)
        );

        if (error) {
            form.setError("email", {
                type: "manual",
                message: error.error,
            });
        }
    };

    return (
        <FormProvider {...form}>
            <form
                className="flex flex-col gap-4"
                onSubmit={form.handleSubmit(handleSubmit)}
                noValidate
                autoComplete="off"
            >
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FieldWithLabel label="Email">
                            <Input type="email" {...field} />
                        </FieldWithLabel>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FieldWithLabel label="Password">
                            <Input type="password" {...field} />
                        </FieldWithLabel>
                    )}
                />
                <Button type="submit" disabled={isSubmitting}>
                    Login
                </Button>
            </form>
        </FormProvider>
    );
}
