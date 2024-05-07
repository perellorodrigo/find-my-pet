import { SearchView } from "@/components/SearchView";
import getPets, { Filter } from "@/actions/getPets";
import { filterableFields } from "@/lib/types";

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

	const [allResults, results] = await Promise.all([
		allResultsPromise,
		resultsPromise,
	]);

	const allFilters = allResults.items.reduce<Record<string, string[]>>(
		(acc, item) => {
			const fields = item.fields;

			for (const field of filterableFields) {
				const value = fields[field];

				if (!value) {
					continue;
				}

				if (!acc[field]) {
					acc[field] = [value];
					continue;
				}

				if (!acc[field].includes(value)) acc[field].push(value);
			}

			return acc;
		},
		{}
	);

	return (
		<main className="flex min-h-screen flex-col items-center justify-between">
			<SearchView
				total={results.total}
				limit={results.limit}
				skip={results.skip}
				initialResults={results.items}
				allFilters={allFilters}
			/>
		</main>
	);
}
