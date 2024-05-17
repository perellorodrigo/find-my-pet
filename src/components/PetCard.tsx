"use client";

import React from "react";
import Image from "next/image";
import type { Asset, AssetDetails } from "contentful";

import { filterableFields, LABEL_VALUES, PetResponseItem } from "@/lib/types";
import {
	Carousel,
	CarouselContent,
	CarouselDots,
	CarouselItem,
	CarouselNext,
	CarouselPrevious,
} from "@/components/ui/carousel";

import ContentfulRichTextRenderer from "./ContentfulRichText";

function CardBasicInfo({ item }: { item: PetResponseItem }) {
	return filterableFields.map((field) => {
		const value = item.fields[field];

		if (!value) {
			return null;
		}

		return (
			<div className="inline-flex items-center" key={value}>
				<p className="text-sm break-all font-light text-primary">
					<span className="font-semibold">{LABEL_VALUES[field]}: </span>
					{value}
				</p>
			</div>
		);
	});
}

function PetCard({ pet }: { pet: PetResponseItem }) {
	const pictures = pet.fields.pictures;
	const count = pictures?.length || 0;

	return (
		<div
			className={`flex flex-col rounded-lg shadow-md overflow-hidden bg-white relative`}
		>
			<Carousel className="group">
				<CarouselContent>
					{pictures?.map((pic) => {
						const asset = pic as Asset;

						const assetDetails = asset?.fields.file?.details as AssetDetails;

						const width = assetDetails?.image?.width || 300;
						const height = assetDetails?.image?.height || 300;

						return (
							<CarouselItem
								key={pic.sys.id}
								className="flex flex-col justify-center"
							>
								<Image
									src={`https:${pic.fields.file?.url}`}
									alt=""
									width={width}
									height={height}
									sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
								/>
							</CarouselItem>
						);
					})}
				</CarouselContent>
				{count > 1 && (
					<>
						<div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-opacity">
							<CarouselPrevious />
							<CarouselNext />
						</div>

						<CarouselDots className="p-4" />
					</>
				)}
			</Carousel>

			<div className="pt-2 px-4 pb-4 flex flex-col space-y-2 justify-between flex-1">
				<div className="flex flex-col">
					<CardBasicInfo item={pet} />
					<ContentfulRichTextRenderer
						content={pet.fields.description}
						className="mt-2 space-y-1"
					/>
				</div>
			</div>
		</div>
	);
}

export { PetCard };
