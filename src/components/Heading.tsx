import { cn } from "@/lib/utils";

const HEADING_CLASSES = {
	// class="
	h1: `text-2xl font-semibold`,
	h2: "text-xl",
	h3: "text-lg",
	h4: "text-lg",
	h5: "text-base",
	h6: "text-sm",
	// "
} as const;

type HeadingProps = JSX.IntrinsicElements[keyof typeof HEADING_CLASSES] & {
	level?: keyof typeof HEADING_CLASSES;
};

const Heading = ({ children, level, ...props }: HeadingProps) => {
	const HeadingComponent = level || "h1";
	const textColor = `text-neutral-700`;

	return (
		<HeadingComponent
			className={cn(
				HEADING_CLASSES[HeadingComponent],
				textColor,
				props.className
			)}
		>
			{children}
		</HeadingComponent>
	);
};

export default Heading;
