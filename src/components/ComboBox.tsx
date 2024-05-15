"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

function ComboOptions({
	values,
	placeholder,
	onSelect,
	selectedValues,
}: {
	selectedValues: Set<string>;
	values: [string, boolean][];
	placeholder: string;
	onSelect: (value: string) => void;
}) {
	return (
		<Command>
			<CommandInput placeholder={placeholder} className="text-md" />
			<CommandList>
				<CommandEmpty>Sem resultados.</CommandEmpty>
				<CommandGroup>
					{values.map(([value, isDisabled], idx) => (
						<CommandItem
							key={value}
							value={value}
							onSelect={() => onSelect(value)}
							disabled={!selectedValues.has(value) && isDisabled}
						>
							<Check
								className={cn(
									"mr-2 size-4",
									selectedValues.has(value) ? "opacity-100" : "opacity-0"
								)}
							/>
							{value}
						</CommandItem>
					))}
				</CommandGroup>
			</CommandList>
		</Command>
	);
}

export function ComboBox({
	prompt,
	values,
	onSelect,
	selectedValues,
}: {
	prompt: string;
	values: [string, boolean][];
	selectedValues: Set<string>;
	onSelect: (value: string) => void;
}) {
	const [open, setOpen] = React.useState(false);
	const isDesktop = useMediaQuery("(min-width: 768px)");

	const selectedArr = Array.from(selectedValues || []);
	const label =
		selectedArr.length === 0
			? prompt
			: selectedArr.length === 1
				? selectedArr[0]
				: `${selectedArr[0]} (+${selectedArr.length - 1})`;

	if (isDesktop) {
		return (
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						className="justify-between w-full"
					>
						{label}
						<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="p-0">
					<ComboOptions
						onSelect={onSelect}
						placeholder={prompt}
						selectedValues={selectedValues}
						values={values}
					/>
				</PopoverContent>
			</Popover>
		);
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<DrawerTrigger asChild>
				<Button variant="outline" className="justify-between w-full">
					{label}
					<ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
				</Button>
			</DrawerTrigger>
			<DrawerContent>
				<div className="">
					<ComboOptions
						onSelect={onSelect}
						placeholder={prompt}
						selectedValues={selectedValues}
						values={values}
					/>
				</div>
			</DrawerContent>
		</Drawer>
	);
}
