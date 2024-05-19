"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { FormProvider, useForm } from "react-hook-form";
import { z } from "zod"; // Add new import

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Dropzone from "@/components/ui/dropzone";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import Heading from "@/components/Heading";

import { createBatchUploadIntent, uploadToContentful } from "./actions";

// list of image mime types
const ACCEPTED_IMAGE_TYPES = [
    "image/jpeg",
    "image/pjpeg",
    "image/png",
    "image/webp",
];

const BATCH_SIZE = 5;

const MAX_FILE_SIZE = 10000000;
const FormSchema = z.object({
    contactDetails: z.string(),
    address: z.string().min(1),
    additionalInfo: z.string(),
    files: z
        .custom<FileList>()
        .refine((files) => files && files.length > 0, "Image is required.")
        .refine((files) => {
            return (
                files &&
                Array.from(files).every((f: File) => {
                    console.log("File size: ", f.size, f);

                    return f.size <= MAX_FILE_SIZE;
                })
            );
        }, `Max file size is 10MB.`)
        .refine(
            (files) =>
                files &&
                Array.from(files).every((f: File) =>
                    ACCEPTED_IMAGE_TYPES.includes(f.type)
                ),
            ".jpg, .jpeg, .png and .webp files are accepted."
        ),
    apiKey: z.string(),
});

type FormValues = z.infer<typeof FormSchema>;

async function uploadToS3({
    file,
    url,
    fields,
}: {
    file: File;
    url: string;
    fields: Record<string, string>;
}) {
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
        formData.append(key, value as string);
    });

    formData.append("file", file);

    // Upload the file to S3
    const uploadResponse = await fetch(url, {
        method: "POST",
        body: formData,
    });

    if (uploadResponse.ok) {
        const fileUrl = `${url}${fields.key}`;
        return fileUrl;
    } else {
        throw new Error("S3 Upload Error");
    }
}

function assertAllFulfilled<T>(
    result: PromiseSettledResult<T>[]
): result is PromiseFulfilledResult<T>[] {
    return result.every((r) => r.status === "fulfilled");
}

function isPromiseFulfilled<T>(
    result: PromiseSettledResult<T>
): result is PromiseFulfilledResult<T> {
    return result.status === "fulfilled";
}

export default function BatchUploader() {
    const uploadIntentMutation = useMutation({
        mutationFn: createBatchUploadIntent,
        onSuccess: (data) => {
            console.log("onSuccess uploadIntent", data);
        },
        onError: (error) => {
            console.error("onError uploadIntent", error);
        },
    });

    const uploadS3Mutation = useMutation({
        mutationFn: uploadToS3,
        onSuccess: (data) => {
            console.log("onSuccess uploadToS3", data);
        },
        onError: (error) => {
            console.error("onError uploadToS3", error);
        },
    });

    const uploadToContentfulMutation = useMutation({
        mutationFn: uploadToContentful,
        onSuccess: (data) => {
            console.log("onSuccess uploadToContentful", data);
        },
        onError: (error) => {
            console.error("onError uploadToContentful", error);
        },
    });

    const [progress, setProgress] = useState<{
        current: number;
        total: number;
    } | null>();

    const isSubmitting =
        uploadIntentMutation.isPending ||
        uploadS3Mutation.isPending ||
        uploadToContentfulMutation.isPending;

    const form = useForm<FormValues>({
        shouldFocusError: true,
        shouldUnregister: false,
        shouldUseNativeValidation: false,
        resolver: zodResolver(FormSchema),
        defaultValues: {
            contactDetails: "",
            address: "",
            additionalInfo: "",
            apiKey: "",
        },
    });

    async function handleOnDrop(files: FileList | null) {
        if (files && files.length > 0) {
            const allowedType = { name: "image", types: ACCEPTED_IMAGE_TYPES };
            const everyFileValid = Array.from(files).every((file) =>
                allowedType.types.includes(file.type)
            );

            if (!everyFileValid) {
                form.setError("files", {
                    message: "One of te files is not a valid image type.",
                    type: "typeError",
                });
            } else {
                form.clearErrors("files");
                form.setValue("files", files);
            }
        } else {
            form.resetField("files");
            form.setError("files", {
                message: "File is required",
                type: "typeError",
            });
        }
    }

    const handleFormSubmit = async ({
        additionalInfo,
        address,
        contactDetails,
        files,
        apiKey,
    }: FormValues) => {
        const filesArray = Array.from(files);

        const result = await uploadIntentMutation.mutateAsync({
            files: filesArray.map((file) => ({
                contentType: file.type,
                filename: file.name,
            })),
        });

        if (!assertAllFulfilled(result)) {
            const rejectedIntents = result.reduce<
                {
                    fileName: string;
                    reason: string;
                }[]
            >((acc, response, index) => {
                if (response.status === "rejected") {
                    acc.push({
                        fileName: filesArray[index].name,
                        reason: response.reason,
                    });
                }

                return acc;
            }, []);

            console.error(
                "Error creating upload intent for files:",
                rejectedIntents
            );

            form.setError("files", {
                message: `Error creating upload intent for files: \n${rejectedIntents.map((f) => `${f.fileName} : ${f.reason}`).join("\n")}`,
                type: "validate",
            });

            return;
        }

        // Helper function to update progress state
        const tickProgress = (newVal?: number) =>
            setProgress((currentVal) => ({
                current: newVal ?? (currentVal?.current || 0) + 1,
                total: result.length,
            }));

        tickProgress(0);

        for (let i = 0; i < result.length; i += BATCH_SIZE) {
            const batch = result.slice(i, i + BATCH_SIZE);

            const batchResult = await Promise.allSettled(
                batch.map(async (response, index) => {
                    const actualIndex = i + index;

                    const file = filesArray[actualIndex];

                    const fileUrl = await uploadS3Mutation.mutateAsync({
                        ...response.value,
                        file,
                    });

                    tickProgress();

                    return {
                        file,
                        fileUrl,
                    };
                })
            );

            const sucessfulBatch = batchResult.filter(isPromiseFulfilled);
            if (sucessfulBatch.length === 0) {
                console.error("Error uploading batch", batchResult);
            } else {
                await uploadToContentfulMutation.mutateAsync({
                    apiKey,
                    additionalInfo,
                    address,
                    contactDetails,
                    images: sucessfulBatch.map(
                        ({ value: { file, fileUrl } }) => ({
                            contentLength: file.size.toString(),
                            contentType: file.type,
                            fileName: file.name,
                            url: fileUrl,
                        })
                    ),
                });
            }

            tickProgress(i + batch.length);
        }

        form.resetField("files");
    };

    return (
        <div className={cn("container max-w-screen-lg")}>
            <Heading level={"h1"} className="my-2">
                Upload de imagem
            </Heading>
            <FormProvider {...form}>
                <form
                    className="flex flex-col gap-4"
                    onSubmit={form.handleSubmit(handleFormSubmit)}
                    noValidate
                    autoComplete="off"
                >
                    <FormField
                        control={form.control}
                        name="apiKey"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>API Key</FormLabel>
                                <FormControl>
                                    <Input type="password" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="contactDetails"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>
                                    Contato (Instagram ou Telefone)
                                </FormLabel>
                                <FormControl>
                                    <Input
                                        placeholder="51 99999 9999"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Endereco</FormLabel>
                                <FormControl>
                                    <Input placeholder="" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="additionalInfo"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Informações adicionais</FormLabel>
                                <FormControl>
                                    <Input placeholder="" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="files"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormControl>
                                    <Dropzone
                                        {...field}
                                        dropMessage="Largue a imagem aqui ou clique para selecionar um arquivo."
                                        handleOnDrop={handleOnDrop}
                                        allowedTypes={ACCEPTED_IMAGE_TYPES.join(
                                            ","
                                        )}
                                        multiple
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    {progress && (
                        <div className="flex flex-col items-center gap-4">
                            <Progress
                                value={
                                    (progress.current / progress.total) * 100
                                }
                                className="w-full [&>*]:duration-1000"
                            />
                            <p className="text-sm font-medium">
                                {Math.floor(progress.current)} de{" "}
                                {progress.total} imagens enviadas
                            </p>
                        </div>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        Batch Upload
                    </Button>
                </form>
            </FormProvider>
        </div>
    );
}
