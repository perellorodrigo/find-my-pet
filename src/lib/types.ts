import type { Asset, Entry, EntryFieldTypes } from "contentful";

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

export type PetItem = Entry<PetSkeleton, undefined, string>;

export type SiteConfigSkeleton = {
    contentTypeId: "siteConfig";
    fields: {
        title: EntryFieldTypes.Text;
        introRichText: EntryFieldTypes.RichText;
    };
};

export type PetResponseItem = {
    sys: {
        id: string;
    };
    fields: Omit<PetItem["fields"], "pictures"> & {
        pictures: {
            sys: {
                id: string;
            };
            fields: Asset["fields"];
        }[];
    };
};

export type PetResponse = {
    total: number;
    skip: number;
    limit: number;
    items: PetResponseItem[];
};

export const filterableFields = [
    "species",
    "breed",
    "size",
    "gender",
    "color",
] as const;

export type FilterableField = (typeof filterableFields)[number];

export const LABEL_VALUES: Record<string, string> = {
    breed: "Raça",
    size: "Porte",
    species: "Espécie",
    gender: "Sexo",
    color: "Cor",
} satisfies Record<FilterableField, string>;
