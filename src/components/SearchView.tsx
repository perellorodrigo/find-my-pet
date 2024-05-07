"use client";
import {
	ChangeEventHandler,
	HTMLProps,
	MouseEventHandler,
	PropsWithChildren,
	PropsWithoutRef,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	useTransition,
} from "react";
import Heading from "./Heading";
import { ComboBox } from "./ComboBox";
import Image from "next/image";
import type { Asset, AssetDetails, Entry, EntryCollection } from "contentful";
import {
	filterableFields,
	type FilterableField,
	type PetSkeleton,
} from "@/lib/types";
import getPets, { Filter } from "@/actions/getPets";
import {
	documentToReactComponents,
	Options as RichTextOptions,
} from "@contentful/rich-text-react-renderer";
import { BLOCKS, Document } from "@contentful/rich-text-types";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import { getFiltersFromResults } from "@/lib/utils";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "./ui/input";
// import { Input } from "./ui/input";

const LABEL_VALUES: Record<string, string> = {
	breed: "Raça",
	size: "Porte",
	species: "Espécie",
	gender: "Sexo",
	color: "Cor",
} satisfies Record<FilterableField, string>;

function CardInfo({
	label,
	value,
}: PropsWithChildren<{
	label: string;
	value: string;
}>) {
	return (
		<div className="inline-flex items-center">
			<p className="text-sm break-all font-light text-primary">
				<span className="font-semibold">{label}: </span>
				{value}
			</p>
		</div>
	);
}

const options: RichTextOptions = {
	renderNode: {
		[BLOCKS.HEADING_1]: (_, children) => (
			<Heading level="h1">{children}</Heading>
		),
		[BLOCKS.HEADING_2]: (_, children) => (
			<Heading level="h2">{children}</Heading>
		),
		[BLOCKS.HEADING_3]: (_, children) => (
			<Heading level="h3">{children}</Heading>
		),
		[BLOCKS.HEADING_4]: (_, children) => (
			<Heading level="h4">{children}</Heading>
		),
		[BLOCKS.HEADING_5]: (_, children) => (
			<Heading level="h5">{children}</Heading>
		),
		[BLOCKS.HEADING_6]: (_, children) => (
			<Heading level="h6">{children}</Heading>
		),
		[BLOCKS.PARAGRAPH]: (node, children) => (
			<p className="text-neutral-600 text-sm">{children}</p>
		),
	},
};

function RichTextRenderer({
	content,
	className,
}: PropsWithoutRef<{ content: Document; className: string }>) {
	return (
		<div className={className}>
			{documentToReactComponents(content, options)}
		</div>
	);
}

function CardBasicInfo({
	item,
}: {
	item: Entry<PetSkeleton, undefined, string>;
}) {
	return filterableFields.map((field) => {
		const value = item.fields[field];

		if (!value) {
			return null;
		}

		return (
			<CardInfo
				key={field}
				label={LABEL_VALUES[field]}
				value={value}
			/>
		);
	});
}

function getFiltersForSearch(filters: Record<string, Set<string>>) {
	return Object.entries(filters).reduce<{
		[key in FilterableField]?: string[];
	}>((acc, [key, value]) => {
		acc[key as FilterableField] = Array.from(value);
		return acc;
	}, {});
}

const debounce = <T extends (...args: any[]) => void>(fn: T, ms = 250) => {
	let timeoutId: ReturnType<typeof setTimeout>;
	return ((...args: any[]) => {
		clearTimeout(timeoutId);
		timeoutId = setTimeout(() => fn(...args), ms);
	}) as T;
};

export function SearchView({
	allTotal,
	total,
	limit,
	initialResults,
	allFilters,
}: {
	allTotal: number;
	total: number;
	limit: number;
	skip: number;
	initialResults: EntryCollection<PetSkeleton, undefined, string>["items"];
	allFilters: Record<string, string[]>;
}) {
	const [searchTerm, setSearchTerm] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const [skip, setSkip] = useState(0);
	const [totalResults, setTotalResults] = useState(total);
	const [results, setResults] = useState(initialResults);

	const searchParams = useSearchParams();
	const { toast } = useToast();

	const [selectedFilters, setSelectedFilters] = useState<
		Record<FilterableField, Set<string>>
	>({
		breed: new Set(searchParams.getAll("breed")),
		size: new Set(searchParams.getAll("size")),
		species: new Set(searchParams.getAll("species")),
		gender: new Set(searchParams.getAll("gender")),
		color: new Set(searchParams.getAll("color")),
	});

	const fullPath = usePathname();

	const debounceSearch = useCallback(
		debounce((searchQuery: string, filters: Filter) => {
			setIsLoading(true);

			getPets({
				filters: filters,
				searchTerm: searchQuery,
			}).then((res) => {
				setResults(res.items);
				setSkip(res.skip);
				setTotalResults(res.total);
				setIsLoading(false);
			});
		}),
		[]
	);

	const handleSelectedValues =
		(fieldName: FilterableField) => (value: string) => {
			const newVal = new Set(Array.from(selectedFilters[fieldName]));

			if (newVal.has(value)) {
				newVal.delete(value);
			} else {
				newVal.add(value);
			}

			const newFilters = {
				...selectedFilters,
				[fieldName]: newVal,
			};

			setSelectedFilters(newFilters);
			debounceSearch(searchTerm, getFiltersForSearch(newFilters));
		};

	const handleSearch: ChangeEventHandler<HTMLInputElement> = (e) => {
		// This is an instant UI change
		setSearchTerm(e.target.value);

		debounceSearch(e.target.value, getFiltersForSearch(selectedFilters));
	};

	const handleLoadMore = () => {
		getPets({
			filters: getFiltersForSearch(selectedFilters),
			skip: skip + limit,
		}).then((res) => {
			setResults([...results, ...res.items]);
			setSkip(res.skip);
			setTotalResults(res.total);
		});
	};

	const handleCopySearch: MouseEventHandler<HTMLButtonElement> = (e) => {
		e.preventDefault();
		const newParams = new URLSearchParams();
		Object.entries(selectedFilters).forEach(([key, value]) => {
			Array.from(value).forEach((v) => {
				newParams.append(key, v);
			});
		});

		try {
			const [f] = fullPath.split("?");
			const url = `${f}?${newParams.toString()}`;
			const shareURL = `${window.location.origin}${url}`;

			if (navigator.share) {
				navigator
					.share({
						title: document.title,
						text: "",
						url: shareURL,
					})
					.catch((error) =>
						console.log("Error sharing:", error)
					);
			} else {
				navigator.clipboard.writeText(shareURL);
				toast({
					title: "Link copiado",
					description:
						"O link foi copiado para a área de transferência",
				});
			}
		} catch (error) {
			console.log("Error copying search:", error);
		}
	};

	const filtersWithDisabled = useMemo(() => {
		// TODO:...
		const filtersFromResults = getFiltersFromResults(results);

		return Object.entries(allFilters).reduce<{
			[key in FilterableField]?: [string, boolean][];
		}>((acc, val) => {
			const [key, value] = val as [FilterableField, string[]];

			acc[key] = [...value].map((v) => [v, false]);

			return acc;
		}, {});
	}, [allFilters, results]);

	return (
		<div className="z-10 w-full max-w-7xl container space-y-4 py-8">
			<Heading level="h1" className="my-4 text-center">
				Encontre seu Pet (Canoas RS)
			</Heading>
			<p className="text-center text-neutral-600">
				<AlertTriangle className="inline h-5 w-5  mr-2" />
				Estamos adicionando mais animais constantemente, se não
				achar o seu pet, não perca a esperança e volte mais tarde{" "}
			</p>
			<p className="text-center text-neutral-600">
				Os filtros não são exatos, selecione mais de um para ficar
				mais fácil de encontrar o que procura. Atualmente temos{" "}
				{allTotal} pets cadastrados.
			</p>

			<div className="flex w-full max-w-2xl mx-auto items-center space-x-2"></div>
			<div className="flex flex-col space-y-2">
				<div className="flex flex-grow space-x-2 relative">
					<Input
						type="search"
						enterKeyHint="search"
						placeholder="Pesquise por texto..."
						value={searchTerm}
						onChange={handleSearch}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								e.currentTarget?.blur?.();
							}
						}}
						className="flex-grow text-md"
					/>
				</div>
				<div className="flex flex-wrap gap-2">
					{Object.entries(filtersWithDisabled)
						.filter((v) => v[1].length > 1)
						.map((filterValue) => {
							const [fieldName, allValues] =
								filterValue as [
									FilterableField,
									[string, boolean][]
								];

							return (
								<div
									key={fieldName}
									className="flex-grow"
								>
									<ComboBox
										onSelect={handleSelectedValues(
											fieldName
										)}
										selectedValues={
											selectedFilters?.[
												fieldName
											] || new Set()
										}
										prompt={
											LABEL_VALUES[fieldName]
										}
										values={Array.from(allValues)}
									/>
								</div>
							);
						})}
					<Button onClick={handleCopySearch} variant={"ghost"}>
						Compartilhar Busca
					</Button>
				</div>
			</div>
			<div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
					{isLoading && (
						<div className="flex justify-center items-center col-span-2 sm:col-span-3 lg:col-span-4">
							<Loader2 className="h-8 w-8 animate-spin" />
						</div>
					)}
					{results.map((item) => {
						const pictures = item.fields.pictures;

						const firstPic = pictures?.[0] as Asset;
						const assetDetails = firstPic?.fields.file
							?.details as AssetDetails;

						const width = assetDetails?.image?.width || 300;
						const height = assetDetails?.image?.height || 300;
						return (
							<div
								key={item.sys.id}
								className={`flex flex-col rounded-lg shadow-md overflow-hidden bg-white`}
							>
								{firstPic && (
									<Image
										src={`https:${firstPic.fields.file?.url}`}
										alt=""
										width={width}
										height={height}
										sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
									/>
								)}

								<div className="p-4 flex flex-col space-y-2 justify-between flex-1">
									<div className="flex flex-col">
										<CardBasicInfo item={item} />

										<RichTextRenderer
											content={
												item.fields
													.description
											}
											className="mt-2 space-y-1"
										/>
									</div>

									{/* <p className="text-xs text-neutral-600 pt-6">
										ID: {item.sys.id}
									</p> */}
								</div>
							</div>
						);
					})}
				</div>

				<div className="flex flex-col justify-center items-center w-full mt-4 space-y-2">
					<p>
						{results.length} de {totalResults} resultados
					</p>
					<Button
						onClick={handleLoadMore}
						variant={"outline"}
						disabled={results.length === totalResults}
					>
						Carregar mais
					</Button>
				</div>
			</div>
		</div>
	);
}
