import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { filterableFields, PetResponse } from "./types";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function getFiltersFromResults(items: PetResponse["items"]) {
    return items.reduce<Record<string, string[]>>((acc, item) => {
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
    }, {});
}
