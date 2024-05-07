"use client";
import {
	HTMLProps,
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
import type { Asset, Entry, EntryCollection } from "contentful";
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

export function SearchView({
	initialResults,
	allFilters,
}: {
	initialResults: EntryCollection<PetSkeleton, undefined, string>["items"];
	allFilters: Record<string, string[]>;
}) {
	const [results, setResults] = useState(initialResults);

	const searchParams = useSearchParams();

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

			getPets({
				filters: Object.entries(newFilters).reduce<{
					[key in FilterableField]?: string[];
				}>((acc, [key, value]) => {
					acc[key as FilterableField] = Array.from(value);
					return acc;
				}, {}),
			}).then((res) => {
				setResults(res.items);
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

		const [f] = fullPath.split("?");
		const url = `${f}?${newParams.toString()}`;

		navigator.clipboard.writeText(window.location.origin + url);
	};

	return (
		<div className="z-10 w-full max-w-7xl container space-y-4 py-8">
			<Heading level="h1" className="my-4 text-center">
				Encontre seu Pet (Canoas RS)
			</Heading>
			<p className="text-center text-neutral-600">
				Os filtros não são exatos, selecione mais de um para ficar
				mais fácil de encontrar o que procura.
			</p>
			<div className="flex justify-center">
				<div className="flex flex-wrap gap-2">
					{Object.entries(allFilters)
						.filter((v) => v[1].length > 1)
						.map((filterValue) => {
							const [fieldName, allValues] =
								filterValue as [
									FilterableField,
									string[]
								];

							return (
								<div key={fieldName}>
									{/* <p>{LABEL_VALUES[fieldName]}</p> */}
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
					<Button onClick={handleCopySearch}>
						Copiar Pesquisa
					</Button>
				</div>
			</div>
			<div>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
					{results.map((item) => {
						const pictures = item.fields.pictures;

						const firstPic = pictures?.[0] as Asset;
						return (
							<div
								key={item.sys.id}
								className={`flex flex-col rounded-lg shadow-md overflow-hidden bg-white`}
							>
								{firstPic && (
									<Image
										src={`https:${firstPic.fields.file?.url}`}
										alt=""
										width={300}
										height={200}
										objectFit="contain"
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

									<p className="text-xs text-neutral-600 pt-6">
										ID: {item.sys.id}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
