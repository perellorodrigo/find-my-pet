"use server";

import { FilterableField, PetSkeleton } from "@/lib/types";
import { createClient } from "contentful";

export type GetPetParams = {
	page?: number;
	results?: number;
	filters?: {
		[key in FilterableField]?: string[];
	};
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

async function getPets({ filters }: GetPetParams) {
	const getFilterValue = (arr: string[] | undefined) => {
		return Array.isArray(arr) && arr.length > 0 ? arr : undefined;
	};

	console.log("filters", filters?.species);

	const results = await client.getEntries<PetSkeleton>({
		content_type: "pet",
		"fields.gender[in]": getFilterValue(filters?.gender),
		"fields.species[in]": getFilterValue(filters?.species),
		"fields.breed[in]": getFilterValue(filters?.breed),
		"fields.size[in]": getFilterValue(filters?.size),
		"fields.color[in]": getFilterValue(filters?.color),
	});

	return {
		items: results.items,
	};
}

export default getPets;
