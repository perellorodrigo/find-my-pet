import type { NextApiRequest, NextApiResponse } from "next";
import {
	FilterableField,
	PetResponse,
	PetSkeleton,
	filterableFields,
} from "@/lib/types";
import { createClient } from "contentful";
import { kv } from "@vercel/kv";
import { NextRequest } from "next/server";

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

	const cached = await kv.get<PetResponse>(cacheKey);
	if (cached) {
		console.log("Cache hit for", cacheKey);
		return cached;
	}

	const results = await client.getEntries<PetSkeleton>({
		content_type: "pet",
		"fields.gender[in]": getFilterValue(filters?.gender),
		"fields.species[in]": getFilterValue(filters?.species),
		"fields.breed[in]": getFilterValue(filters?.breed),
		"fields.size[in]": getFilterValue(filters?.size),
		"fields.color[in]": getFilterValue(filters?.color),
		skip: skip || 0,
		query: searchTerm,
	});

	const returnObj = {
		items: results.items,
		total: results.total,
		limit: results.limit,
		skip: results.skip,
	};

	console.log("Setting cache for", cacheKey);
	await kv.set(cacheKey, JSON.stringify(returnObj), {
		ex: 60 * 60, // 1 hour
	});

	return returnObj;
}

export async function GET(request: NextRequest) {
	const query = request.nextUrl.searchParams;

	const filters: Filter = {};

	filterableFields.forEach((field) => {
		const filterValue = query.getAll(field);
		if (filterValue) {
			filters[field] = Array.isArray(filterValue)
				? filterValue
				: [filterValue];
		}
	});

	const searchTerm = query.get("searchTerm");
	const skip_str = query.get("skip");

	const result = await getPets({
		filters,
		searchTerm: searchTerm ?? undefined,
		skip: skip_str ? +skip_str : undefined,
	});

	return Response.json(result);
}
