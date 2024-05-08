import { SearchView } from "@/components/SearchView";
import { Filter, getPets } from "@/lib/getPets";
import { filterableFields } from "@/lib/types";
import { getFiltersFromResults } from "@/lib/utils";

export default async function Home({
	searchParams,
}: {
	searchParams: { [key: string]: string | string[] | undefined };
}) {
	const filters: Filter = {};

	filterableFields.forEach((field) => {
		const filterValue = searchParams[field];
		if (filterValue) {
			filters[field] = Array.isArray(filterValue)
				? filterValue
				: [filterValue];
		}
	});

	const allResultsPromise = getPets({});

	const resultsPromise = (async () => {
		if (Object.keys(filters).length === 0) {
			return allResultsPromise;
		}

		const filteredResults = await getPets({ filters });
		return filteredResults;
	})();

	let [allResults, results] = await Promise.all([
		allResultsPromise,
		resultsPromise,
	]);

	// Need to have a copy so it doesnt get mutated if points to same reference as allResults
	const initialResults = {
		items: [...results.items],
		total: results.total,
		limit: results.limit,
		skip: results.skip,
	};

	// TODO: Look into caching this
	let pageCount = 0;
	while (allResults.items.length < allResults.total || pageCount === 10) {
		const nextResults = await getPets({
			skip: allResults.skip + allResults.limit,
		});

		allResults.items = allResults.items.concat(nextResults.items);
		allResults.total = nextResults.total;
		allResults.skip = nextResults.skip;
		allResults.limit = nextResults.limit;
		pageCount++;
	}

	const allFilters = getFiltersFromResults(allResults.items);

	return (
		<main className="flex min-h-screen flex-col items-center justify-between">
			<SearchView
				allTotal={allResults.total}
				total={initialResults.total}
				limit={initialResults.limit}
				skip={initialResults.skip}
				initialResults={initialResults.items}
				allFilters={allFilters}
			/>
		</main>
	);
}
