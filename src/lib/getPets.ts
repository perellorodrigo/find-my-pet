import "server-only";
import {
	FilterableField,
	PetResponse,
	PetSkeleton,
	filterableFields,
} from "@/lib/types";
import { createClient } from "contentful";
import { createClient as createKVClient } from "@vercel/kv";

if (!process.env.KV_REST_API_TOKEN || !process.env.KV_REST_API_URL) {
	throw new Error("Missing KV API keys");
}

const kv = createKVClient({
	token: process.env.KV_REST_API_TOKEN,
	url: process.env.KV_REST_API_URL,
	cache: "no-store",
});

export type Filter = {
	[key in FilterableField]?: string[];
};

export type GetPetParams = {
	skip?: number;
	filters?: Filter;
	searchTerm?: string;
};

if (
	!process.env.CONTENTFUL_SPACE_ID ||
	!process.env.CONTENTFUL_DELIVERY_API_KEY
) {
	throw new Error("Missing Contentful API keys");
}

const client = createClient({
	// This is the space ID. A space is like a project folder in Contentful terms
	space: process.env.CONTENTFUL_SPACE_ID,
	// This is the access token for this space. Normally you get both ID and the token in the Contentful web app
	accessToken: process.env.CONTENTFUL_DELIVERY_API_KEY,
});

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

	// Does this write to cache vercel?
	const cached = await kv.get<PetResponse>(cacheKey);
	if (cached) {
		console.log("Cache hit for", cacheKey);
		return cached;
	}

	const results = await client.getEntries<PetSkeleton>(queryObj);

	const returnObj = {
		items: results.items,
		total: results.total,
		limit: results.limit,
		skip: results.skip,
	};

	console.log("Setting cache for", cacheKey);
	await kv.set(cacheKey, JSON.stringify(returnObj), {
		ex: 60 * 60 * 3, // 3 hours
	});

	return returnObj;
}
