import { PropsWithoutRef } from "react";
import {
	documentToReactComponents,
	Options as RichTextOptions,
} from "@contentful/rich-text-react-renderer";
import { BLOCKS, Document, INLINES } from "@contentful/rich-text-types";

import { cn } from "@/lib/utils";

import Heading from "./Heading";

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
		[BLOCKS.PARAGRAPH]: (_, children) => (
			<p className="text-neutral-600">{children}</p>
		),
		[INLINES.HYPERLINK]: (node, children) => {
			return (
				<a
					href={node.data.uri}
					target="_blank"
					rel="noopener noreferrer"
					className={cn(
						"text-primary underline-offset-4 hover:underline",
						"inline-flex whitespace-nowrap text-md font-medium ring-offset-background transition-colors",
						"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
					)}
				>
					{children}
				</a>
			);
		},
	},
};

export default function ContentfulRichTextRenderer({
	content,
	className,
}: PropsWithoutRef<{ content: Document; className: string }>) {
	return (
		<div className={className}>
			{documentToReactComponents(content, options)}
		</div>
	);
}
