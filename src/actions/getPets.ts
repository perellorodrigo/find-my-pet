"use server";

import { FilterableField, PetSkeleton } from "@/lib/types";
import { createClient } from "contentful";

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

async function getPets({ filters, skip, searchTerm }: GetPetParams) {
	const getFilterValue = (arr: string[] | undefined) => {
		return Array.isArray(arr) && arr.length > 0 ? arr : undefined;
	};

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

	return {
		items: results.items,
		total: results.total,
		limit: results.limit,
		skip: results.skip,
	};
}

export default getPets;
