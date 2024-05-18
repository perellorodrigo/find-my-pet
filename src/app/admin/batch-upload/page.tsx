"use client";

import { ChangeEvent, useState } from "react";
import Image from "next/image";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { Asset, AssetDetails } from "contentful";
import { FileCheck2Icon } from "lucide-react";
import { FormProvider, set, useForm } from "react-hook-form";
import { z, ZodType } from "zod"; // Add new import

import { PetResponseItem, PetSkeleton } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import Dropzone from "@/components/ui/dropzone";
import {
	FormControl,
	FormDescription,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import Heading from "@/components/Heading";

import { createBatchUploadIntent, uploadToContentful } from "./actions";

// list of image mime types
const imageTypes = ["image/jpeg", "image/pjpeg", "image/png", "image/webp"];

const defaultValues: {
	files: FileList | null;
	contactDetails: string;
	address: string;
	additionalInfo: string;
	apiKey: string;
} = {
	files: null,
	contactDetails: "",
	address: "",
	additionalInfo: "",
	apiKey: "",
};

const FormSchema: ZodType<typeof defaultValues> = z.object({
	contactDetails: z.string(),
	address: z.string().min(1),
	additionalInfo: z.string().min(8, { message: "additionalInfo is too short" }),
	files: z.instanceof(FileList).nullable(),
	apiKey: z.string().min(1),
});

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

	const isSubmitting =
		uploadIntentMutation.isPending ||
		uploadS3Mutation.isPending ||
		uploadToContentfulMutation.isPending;

	const form = useForm({
		defaultValues,
		shouldFocusError: true,
		shouldUnregister: false,
		shouldUseNativeValidation: false,
		resolver: zodResolver(FormSchema),
	});

	async function handleOnDrop(files: FileList | null) {
		if (files && files.length > 0) {
			const allowedType = { name: "image", types: imageTypes };
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
			form.setValue("files", null);
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
	}: typeof defaultValues) => {
		if (!files) {
			form.setError("files", {
				message: "File is required",
				type: "typeError",
			});
			return;
		}

		const filesArray = Array.from(files);

		const result = await uploadIntentMutation.mutateAsync({
			files: filesArray.map((file) => ({
				contentType: file.type,
				filename: file.name,
			})),
		});

		const rejectedIntents: {
			index: number;
			reason: any;
		}[] = [];

		for (const [index, response] of result.entries()) {
			if (response.status === "rejected") {
				rejectedIntents.push({
					index,
					reason: response.reason,
				});
			}
		}

		if (rejectedIntents.length > 0) {
			form.setError("files", {
				message: `Error creating upload intent for files: ${rejectedIntents.map((f) => filesArray[f.index].name).join(", ")}`,
				type: "validate",
			});

			console.error("Error creating upload intent for files:", rejectedIntents);
			return;
		}

		// for all successful intents, upload the files to S3
		for (const [index, response] of result.entries()) {
			if (response.status === "fulfilled") {
				const s3Result = await uploadS3Mutation.mutateAsync({
					...response.value,
					file: filesArray[index],
				});

				await uploadToContentfulMutation.mutateAsync({
					apiKey,
					additionalInfo,
					address,
					contactDetails,
					images: [
						{
							contentLength: filesArray[index].size.toString(),
							contentType: filesArray[index].type,
							fileName: filesArray[index].name,
							url: s3Result,
						},
					],
				});
			}
		}
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
								<FormLabel>Contato (Instagram ou Telefone)</FormLabel>
								<FormControl>
									<Input placeholder="51 99999 9999" {...field} />
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
										allowedTypes={imageTypes.join(",")}
										multiple
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{form.watch("files") && (
						<div className="flex items-center justify-center gap-3 p-4 relative">
							<FileCheck2Icon className="size-4" />
							<p className="text-sm font-medium">
								{form.watch("files")?.[0]?.name}
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
