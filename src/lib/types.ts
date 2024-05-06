import type { EntryCollection, EntryFieldTypes } from "contentful";

export type PetSkeleton = {
	contentTypeId: "pet";
	fields: {
		title: EntryFieldTypes.Text;
		pictures: EntryFieldTypes.Array<EntryFieldTypes.AssetLink>;
		species: EntryFieldTypes.Text;
		breed: EntryFieldTypes.Text;
		color: EntryFieldTypes.Text;
		description: EntryFieldTypes.RichText;
		size: EntryFieldTypes.Text;
		gender: EntryFieldTypes.Text;
	};
};

export type PetResponse = EntryCollection<PetSkeleton, undefined, string>;
export const filterableFields = [
	"species",
	"breed",
	"size",
	"gender",
	"color",
] as const;

export type FilterableField = (typeof filterableFields)[number];
