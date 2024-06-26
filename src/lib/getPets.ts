import "server-only";

import { Asset, UnresolvedLink } from "contentful";

import {
    FilterableField,
    PetResponse,
    PetResponseItem,
    PetSkeleton,
} from "@/lib/types";

import contentfulClient from "./contentful-client";
import { redisClient } from "./redis-client";

export type Filter = {
    [key in FilterableField]?: string[];
};

export type GetPetParams = {
    skip?: number;
    filters?: Filter;
    searchTerm?: string;
};

function isAsset(
    obj: UnresolvedLink<"Asset"> | Asset<undefined, string>
): obj is Asset<undefined, string> {
    return obj.sys.type === "Asset";
}

export async function getPets({
    filters,
    skip,
    searchTerm,
}: GetPetParams): Promise<PetResponse> {
    const getFilterValue = (arr: string[] | undefined) => {
        // we sort the array to make sure the order is consistent, better caching
        if (!Array.isArray(arr) || arr.length === 0) return undefined;

        return [...arr].sort();
    };

    const queryObj = {
        content_type: "pet",
        "fields.gender[in]": getFilterValue(filters?.gender),
        "fields.species[in]": getFilterValue(filters?.species),
        "fields.breed[in]": getFilterValue(filters?.breed),
        "fields.size[in]": getFilterValue(filters?.size),
        "fields.color[in]": getFilterValue(filters?.color),
        skip: skip || 0,
        query: searchTerm,
    };

    const cacheKey = JSON.stringify(queryObj);

    const cached = await redisClient.get<PetResponse>(cacheKey);

    if (cached) {
        console.log("Cache hit for", cacheKey);
        return cached;
    }

    const results = await contentfulClient.getEntries<PetSkeleton>(queryObj);

    const minifiedResults = results.items.map((item) => {
        const { sys, fields } = item;

        const responseItem: PetResponseItem = {
            sys: {
                id: sys.id,
            },
            fields: {
                ...fields,
                pictures: fields.pictures?.filter(isAsset).map((picture) => {
                    return {
                        fields: picture.fields,
                        sys: {
                            id: picture.sys.id,
                        },
                    };
                }),
            },
        };

        return responseItem;
    });

    const returnObj = {
        items: minifiedResults,
        total: results.total,
        limit: results.limit,
        skip: results.skip,
    };

    console.log("Setting cache for", cacheKey);
    await redisClient.set(cacheKey, JSON.stringify(returnObj), {
        ex: 60 * 60 * 3, // 3 hours
    });

    return returnObj;
}
