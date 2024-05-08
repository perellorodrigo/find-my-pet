import { Filter, getPets } from "@/lib/getPets";
import { filterableFields } from "@/lib/types";
import { NextRequest } from "next/server";

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
