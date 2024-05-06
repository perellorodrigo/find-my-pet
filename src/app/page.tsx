import { SearchView } from "@/components/SearchView";
import getPets from "@/actions/getPets";

export default async function Home() {
	const results = await getPets({});

	return (
		<main className="flex min-h-screen flex-col items-center justify-between bg-violet-100">
			<SearchView initialResults={results.items} />
		</main>
	);
}
