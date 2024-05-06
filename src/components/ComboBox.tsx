"use client";

import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";

export function ComboBox({
	prompt,
	values,
	onSelect,
	selectedValues,
}: {
	prompt: string;
	values: string[];
	selectedValues: Set<string>;
	onSelect: (value: string) => void;
}) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					role="combobox"
					aria-expanded={open}
					className="justify-between"
				>
					{selectedValues.size
						? Array.from(selectedValues).join(", ")
						: prompt}
					<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-[200px] p-0">
				<Command>
					<CommandInput placeholder={prompt} />
					<CommandEmpty>Sem resultados.</CommandEmpty>
					<CommandGroup>
						{values.map((value) => (
							<CommandItem
								key={value}
								value={value}
								onSelect={() => onSelect(value)}
							>
								<Check
									className={cn(
										"mr-2 h-4 w-4",
										selectedValues.has(value)
											? "opacity-100"
											: "opacity-0"
									)}
								/>
								{value}
							</CommandItem>
						))}
					</CommandGroup>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
