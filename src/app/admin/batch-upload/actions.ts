"use server";

import { S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost, PresignedPost } from "@aws-sdk/s3-presigned-post";
import { Entry } from "contentful";
import {
    createClient as createContentfulManagementClient,
    Environment,
} from "contentful-management";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

import {
    BlockList,
    buildContentfulRichTextBlocks,
} from "@/lib/buildContentfulRichTextBlocks";
import { getImagePrompt, OpenAIResponse } from "@/lib/image-ai";
import { verifyAdmin } from "@/lib/supabase/verify-admin";
import type { PetSkeleton } from "@/lib/types";

const openai = new OpenAI({
    apiKey: process.env.OPEN_AI_API_KEY,
});

type BatchUploadRequest = {
    files: {
        filename: string;
        contentType: string;
    }[];
};

type ErrorOrResult<T> =
    | {
          error: null;
          result: T;
      }
    | {
          error: string;
          result?: undefined;
      };

type BatchUploadResponse = ErrorOrResult<PresignedPost[]>;

type ImageUpload = {
    url: string;
    contentType: string;
    contentLength: string;
    fileName: string;
};

type UploadToContentfulParams = {
    contactDetails: string;
    address: string;
    additionalInfo: string;
    // List of urls to the images
    images: ImageUpload[];
};

type PetFields = Entry<PetSkeleton>["fields"];

function assertAllFulfilled<T>(
    result: PromiseSettledResult<T>[]
): result is PromiseFulfilledResult<T>[] {
    return result.every((r) => r.status === "fulfilled");
}

const CONTENTFUL_SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const CONTENTFUL_MANAGEMENT_API_KEY = process.env.CONTENTFUL_MANAGEMENT_API_KEY;

async function uploadAssetToContentful({
    image,
    environment,
}: {
    image: ImageUpload;
    environment: Environment;
}) {
    const asset = await environment.createAsset({
        fields: {
            title: {
                "en-US": image.fileName,
            },
            file: {
                "en-US": {
                    contentType: image.contentType,
                    fileName: image.fileName,
                    upload: image.url,
                },
            },
        },
    });

    let uploadedAsset = await asset.processForLocale("en-US", {
        processingCheckWait: 1000,
    });

    uploadedAsset = await uploadedAsset.publish();

    return uploadedAsset;
}

function getEntryFields({
    assetId,
    aiResponse,
    commonFields,
}: {
    assetId: string;
    aiResponse: OpenAIResponse | undefined;
    commonFields: Pick<
        UploadToContentfulParams,
        "contactDetails" | "address" | "additionalInfo"
    >;
}) {
    const { address, contactDetails, additionalInfo } = commonFields;

    const description: BlockList = [];
    if (address) {
        description.push({
            nodeType: "PARAGRAPH",
            value: `Localização: ${address}`,
            marks: [],
        });
    }

    if (contactDetails) {
        description.push({
            nodeType: "PARAGRAPH",
            value: `Contato: ${contactDetails}`,
            marks: [],
        });
    }

    if (additionalInfo) {
        description.push({
            nodeType: "PARAGRAPH",
            value: `Informações adicionais: ${additionalInfo}`,
            marks: [],
        });
    }

    const entryFields: PetFields = {
        title: {
            "en-US": `Script - ${contactDetails}`,
        },
        pictures: {
            "en-US": [
                {
                    sys: {
                        type: "Link",
                        linkType: "Asset",
                        id: assetId,
                    },
                },
            ],
        },
        species: {
            "en-US": (aiResponse?.species || "Vira Lata").trim(),
        },
        breed: {
            "en-US": (aiResponse?.breed || "").trim(),
        },
        color: {
            "en-US": (aiResponse?.color || "").trim(),
        },
        description: {
            "en-US": buildContentfulRichTextBlocks(description),
        },
        size: {
            "en-US": (aiResponse?.size || "").trim(),
        },
        gender: {
            "en-US":
                aiResponse?.gender &&
                ["macho", "fêmea"].includes(aiResponse.gender)
                    ? aiResponse.gender
                    : "indefinido",
        },
    };

    return entryFields;
}

// STEPS:
// 1 - Upload images to S3
// 2 - Run AI to generate description
// 3 - Save the entry in Contentful
export async function createBatchUploadIntent({
    files,
}: BatchUploadRequest): Promise<BatchUploadResponse> {
    const isAdmin = await verifyAdmin();
    if (!isAdmin)
        return {
            error: "Unauthorized",
        };

    const BUCKET_NAME = process.env.AWS_BUCKET_NAME;
    if (!BUCKET_NAME) {
        console.error("Missing AWS_BUCKET_NAME");
        return {
            error: "Server Error",
        };
    }

    const client = new S3Client({ region: process.env.AWS_REGION });

    const result = await Promise.allSettled(
        files.map(async ({ contentType, filename }) => {
            const { url, fields } = await createPresignedPost(client, {
                Bucket: BUCKET_NAME,
                Key: uuidv4(),
                Conditions: [
                    ["content-length-range", 0, 10485760], // up to 10 MB
                    ["starts-with", "$Content-Type", contentType],
                ],
                Fields: {
                    acl: "public-read",
                    "Content-Type": contentType,
                },
            });

            return { url, fields };
        })
    );

    if (!assertAllFulfilled(result)) {
        const rejectedIntents = result.reduce<
            {
                fileName: string;
                reason: string;
            }[]
        >((acc, response, index) => {
            if (response.status === "rejected") {
                acc.push({
                    fileName: files[index].filename,
                    reason: response.reason,
                });
            }

            return acc;
        }, []);

        console.error(
            "Error creating upload intent for files:",
            rejectedIntents
        );

        return {
            error: `Error creating upload intent for files: \n${rejectedIntents.map((f) => `${f.fileName} : ${f.reason}`).join("\n")}`,
        };
    }

    return {
        result: result.map((r) => r.value),
        error: null,
    };
}

export async function uploadToContentful({
    images,
    ...commonFields
}: UploadToContentfulParams): Promise<ErrorOrResult<{}>> {
    const isAdmin = await verifyAdmin();
    if (!isAdmin)
        return {
            error: "Unauthorized",
        };

    // get from api call since we are not protecting the page
    if (!CONTENTFUL_MANAGEMENT_API_KEY || !CONTENTFUL_SPACE_ID) {
        console.error("Missing Contentful Management API Key OR Space ID.");
        return {
            error: "Server Error",
        };
    }

    const managementClient = createContentfulManagementClient({
        accessToken: CONTENTFUL_MANAGEMENT_API_KEY,
    });

    const client = await managementClient.getSpace(CONTENTFUL_SPACE_ID);

    const environment = await client.getEnvironment("master");

    await Promise.allSettled(
        images.map(async (image) => {
            const [uploadedAsset, aiResponse] = await Promise.allSettled([
                uploadAssetToContentful({
                    image,
                    environment,
                }),
                openai.chat.completions.create(
                    getImagePrompt({ imageUrl: image.url })
                ),
            ]);

            if (uploadedAsset.status === "rejected") {
                console.error("Error uploading asset: ", uploadedAsset.reason);
                return;
            }

            let jsonResponse: OpenAIResponse | undefined;

            if (aiResponse.status === "fulfilled") {
                const aiContent = aiResponse.value.choices[0].message.content;
                jsonResponse = aiContent && JSON.parse(aiContent);
            }

            await environment.createEntry("pet", {
                fields: getEntryFields({
                    assetId: uploadedAsset.value.sys.id,
                    aiResponse: jsonResponse,
                    commonFields,
                }),
            });
        })
    );

    return {
        error: null,
        result: {},
    };
}
