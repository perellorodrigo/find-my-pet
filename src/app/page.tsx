import ContentfulRichTextRenderer from "@/components/ContentfulRichText";
import { SearchView } from "@/components/SearchView";
import contentfulClient from "@/lib/contentful-client";
import { Filter, getPets } from "@/lib/getPets";
import { redisClient } from "@/lib/redis-client";
import { SiteConfigSkeleton, filterableFields } from "@/lib/types";
import { getFiltersFromResults } from "@/lib/utils";
import {
	HydrationBoundary,
	QueryClient,
	dehydrate,
} from "@tanstack/react-query";
import { Entry } from "contentful";

const SITE_KEY = "siteConfig-query";

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

	let allFilters = await redisClient.get<Record<string, string[]>>(
		"all-filters"
	);

	if (!allFilters) {
		console.log("Cache miss for all-filters");
		let pageCount = 0;
		while (
			allResults.items.length < allResults.total ||
			pageCount === 20
		) {
			console.log("Fetching more pets for all-filters");
			const nextResults = await getPets({
				skip: allResults.skip + allResults.limit,
			});

			allResults.items = allResults.items.concat(nextResults.items);
			allResults.total = nextResults.total;
			allResults.skip = nextResults.skip;
			allResults.limit = nextResults.limit;
			pageCount++;
		}

		allFilters = getFiltersFromResults(allResults.items);
		await redisClient.set("all-filters", JSON.stringify(allFilters), {
			ex: 60 * 60 * 3, // 3 hours
		});
	} else {
		console.log("Cache hit for all-filters");
	}

	const sortedFilters: Record<string, string[]> = {};
	if (allFilters && typeof allFilters === "object") {
		for (const [key, value] of Object.entries(allFilters)) {
			if (!Array.isArray(value)) continue;

			const sorted = [...value].sort();
			sortedFilters[key] = sorted;
		}
	}

	const queryClient = new QueryClient();

	await queryClient.prefetchInfiniteQuery({
		queryKey: [
			"getPets",
			{
				searchTerm: "",
				filters: filters,
			},
		],
		initialPageParam: {
			skip: 0,
		},
		queryFn: async () => initialResults,
		pages: 1,
		getNextPageParam: (lastPage) => {
			if (lastPage.skip + lastPage.limit < lastPage.total) {
				return {
					skip: lastPage.skip + lastPage.limit,
				};
			}
		},
	});

	let siteConfig = await redisClient.get<
		Entry<SiteConfigSkeleton, undefined, string>
	>(SITE_KEY);

	if (!siteConfig) {
		console.log("Cache miss for siteConfig");
		const siteConfigRes =
			await contentfulClient.getEntries<SiteConfigSkeleton>({
				content_type: "siteConfig",
			});

		siteConfig = siteConfigRes.items?.[0];
		if (siteConfig) {
			await redisClient.set(SITE_KEY, JSON.stringify(siteConfig), {
				ex: 60 * 30, // 30min
			});
		}
	}

	return (
		<main className="flex min-h-screen flex-col items-center">
			<HydrationBoundary state={dehydrate(queryClient)}>
				<div className="z-10 w-full max-w-screen-2xl container space-y-4 py-8">
					<ContentfulRichTextRenderer
						content={siteConfig.fields.introRichText}
						className="text-center space-y-4 mt-8"
					/>
					<SearchView
						allTotal={allResults.total}
						allFilters={sortedFilters}
					/>
				</div>
			</HydrationBoundary>
		</main>
	);
}
