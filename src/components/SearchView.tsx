"use client";
import {
	ChangeEventHandler,
	MouseEventHandler,
	PropsWithChildren,
	PropsWithoutRef,
	useEffect,
	useMemo,
	useState,
} from "react";
import Heading from "./Heading";
import { ComboBox } from "./ComboBox";
import Image from "next/image";
import type { Asset, AssetDetails, Entry, EntryCollection } from "contentful";
import {
	PetResponse,
	PetResponseItem,
	filterableFields,
	type FilterableField,
} from "@/lib/types";
import {
	documentToReactComponents,
	Options as RichTextOptions,
} from "@contentful/rich-text-react-renderer";
import { BLOCKS, Document } from "@contentful/rich-text-types";
import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "./ui/button";
import { cn, getFiltersFromResults } from "@/lib/utils";
import { AlertTriangle, Loader2, Share2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Input } from "./ui/input";
import type { GetPetParams } from "@/lib/getPets";
import { QueryFunction, useInfiniteQuery } from "@tanstack/react-query";
import ContentfulRichTextRenderer from "./ContentfulRichText";

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

const getPets: QueryFunction<
	PetResponse,
	[string, Omit<GetPetParams, "skip">],
	{
		skip: number;
	}
> = async ({ queryKey, pageParam }): Promise<PetResponse> => {
	const [_, { filters, searchTerm }] = queryKey;

	const skip = pageParam.skip;

	const newParams = new URLSearchParams();

	if (filters)
		Object.entries(filters).forEach(([key, value]) => {
			Array.from(value).forEach((v) => {
				newParams.append(key, v);
			});
		});

	if (searchTerm) {
		newParams.append("searchTerm", searchTerm);
	}

	if (skip) {
		newParams.append("skip", skip.toString());
	}

	try {
		const result = await fetch(`/api/get-pets?${newParams.toString()}`);
		const resultJSON = await result.json();
		return resultJSON;
	} catch (error) {
		console.error("Error fetching pets", error);
	}

	return {
		items: [],
		total: 0,
		skip: 0,
		limit: 0,
	};
};

function CardBasicInfo({ item }: { item: PetResponseItem }) {
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
		if (value.size === 0) return acc;

		acc[key as FilterableField] = Array.from(value);
		return acc;
	}, {});
}

export function useDebounce<T>(value: T, delay: number) {
	const [debouncedValue, setDebouncedValue] = useState<T>(value);

	useEffect(() => {
		const handler = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(handler);
		};
	}, [value, delay]);

	return debouncedValue;
}

export function SearchView({
	allTotal,
	allFilters,
}: {
	allTotal: number;
	allFilters: Record<string, string[]>;
}) {
	const [searchTerm, setSearchTerm] = useState("");

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

	const debouncedSearchTerm = useDebounce(searchTerm, 250);

	const {
		data,
		isLoading: isLoadingQuery,
		isFetchingNextPage,
		fetchNextPage,
	} = useInfiniteQuery({
		queryKey: [
			"getPets",
			{
				searchTerm: debouncedSearchTerm,
				filters: getFiltersForSearch(selectedFilters),
			},
		],
		queryFn: getPets,
		getNextPageParam: (lastPage, pages) => {
			return {
				skip: lastPage.skip + lastPage.limit,
			};
		},
		initialPageParam: {
			skip: 0,
		},
	});

	const { pages } = data || {};
	const lastPage = pages?.[pages.length - 1];
	const totalResults = lastPage?.total || 0;

	const results = useMemo(
		() => pages?.flatMap((page) => page.items) || [],
		[pages]
	);

	const fullPath = usePathname();

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
		};

	const handleSearch: ChangeEventHandler<HTMLInputElement> = (e) => {
		// This is an instant UI change
		setSearchTerm(e.target.value);
	};

	const handleLoadMore = () => {
		fetchNextPage();
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

	const handleClearFilters = () => {
		const newFilters = {
			breed: new Set<string>(),
			size: new Set<string>(),
			species: new Set<string>(),
			color: new Set<string>(),
			gender: new Set<string>(),
		};

		setSelectedFilters(newFilters);
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
		<div className="w-full space-y-4">
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
					<Button
						onClick={handleClearFilters}
						variant={"destructive"}
					>
						Limpar Filtros
					</Button>
					<Button onClick={handleCopySearch} variant={"outline"}>
						<Share2 className="mr-2" /> Compartilhar Busca
					</Button>
				</div>
			</div>

			<p className="text-neutral-600">
				{isLoadingQuery ? (
					"Carregando..."
				) : (
					<>
						<span className="font-bold">{totalResults} </span>
						Pets encontrados
					</>
				)}
			</p>

			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-4">
				{isLoadingQuery && (
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
							className={`flex flex-col rounded-lg shadow-md overflow-hidden bg-white relative`}
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
									<ContentfulRichTextRenderer
										content={
											item.fields.description
										}
										className="mt-2 space-y-1"
									/>
								</div>
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
					disabled={
						results.length === totalResults ||
						isFetchingNextPage
					}
				>
					Carregar mais
				</Button>
			</div>
		</div>
	);
}
