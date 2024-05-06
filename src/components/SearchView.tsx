"use client";
import { HTMLProps, PropsWithChildren, useEffect, useState } from "react";
import Heading from "./Heading";
import { ComboBox } from "./ComboBox";
import Image from "next/image";
import type { Asset, EntryCollection } from "contentful";
import {
	filterableFields,
	type FilterableField,
	type PetSkeleton,
} from "@/lib/types";
import getPets from "@/actions/getPets";

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

const LABEL_VALUES: Record<string, string> = {
	breed: "Raça",
	size: "Porte",
	species: "Espécie",
	gender: "Sexo",
	color: "Cor",
} satisfies Record<FilterableField, string>;

export function SearchView({
	initialResults,
}: {
	initialResults: EntryCollection<PetSkeleton, undefined, string>["items"];
}) {
	const [results, setResults] = useState(initialResults);

	const filters = initialResults.reduce<Record<string, Set<string>>>(
		(acc, item) => {
			const fields = item.fields;

			for (const field of filterableFields) {
				const value = fields[field];

				if (!value) {
					continue;
				}

				if (!acc[field]) {
					acc[field] = new Set();
				}

				acc[field].add(value);
			}

			return acc;
		},
		{}
	);

	const [selectedFilters, setSelectedFilters] = useState<
		Record<FilterableField, Set<string>>
	>({
		breed: new Set(),
		size: new Set(),
		species: new Set(),
		gender: new Set(),
		color: new Set(),
	});

	const handleSelectedValues =
		(fieldName: FilterableField) => (value: string) => {
			setSelectedFilters((prevFilters) => {
				const nextFilters = {
					...prevFilters,
					[fieldName]: new Set(prevFilters?.[fieldName]),
				};

				if (nextFilters[fieldName]?.has(value)) {
					nextFilters[fieldName]?.delete(value);
				} else {
					nextFilters[fieldName]?.add(value);
				}

				return nextFilters;
			});
		};

	useEffect(() => {
		const filtersAsArray = Object.entries(selectedFilters).reduce<{
			[key in FilterableField]?: string[];
		}>((acc, [key, value]) => {
			acc[key as FilterableField] = Array.from(value);
			return acc;
		}, {});

		getPets({
			filters: filtersAsArray,
		}).then((res) => {
			setResults(res.items);
		});
	}, [selectedFilters]);

	return (
		<div className="z-10 w-full max-w-7xl container space-y-4">
			<Heading className="my-4 text-center">
				Encontre seu Pet (Canoas RS)
			</Heading>
			<div>
				<div className="flex flex-wrap gap-2">
					{Object.entries(filters).map((filterValue) => {
						const [fieldName, allValues] = filterValue as [
							FilterableField,
							Set<string>
						];

						console.log("allValues", Array.from(allValues));
						return (
							<div key={fieldName}>
								<p>{LABEL_VALUES[fieldName]}</p>
								<ComboBox
									onSelect={handleSelectedValues(
										fieldName
									)}
									selectedValues={
										selectedFilters?.[
											fieldName
										] || new Set()
									}
									prompt="Selecione"
									values={Array.from(allValues)}
								/>
							</div>
						);
					})}
				</div>
			</div>
			<div>
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
					{results.map((item) => {
						const pictures = item.fields.pictures;

						const firstPic = pictures[0] as Asset;

						return (
							<div
								key={item.sys.id}
								className={`flex flex-col rounded-lg shadow-md overflow-hidden`}
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

								<div className="p-4 flex flex-col">
									{filterableFields.map((field) => {
										const value =
											item.fields[field];

										if (!value) {
											return null;
										}

										return (
											<CardInfo
												key={field}
												label={
													LABEL_VALUES[
														field
													]
												}
												value={value}
											/>
										);
									})}

									<p className="text-xs text-neutral-600 mt-4">
										POST ID: {item.sys.id}
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
