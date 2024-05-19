import { cn } from "@/lib/utils";

const HEADING_CLASSES = {
    // class="
    h1: `text-3xl font-semibold leading-relaxed tracking-wide`,
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

    return (
        <HeadingComponent
            className={cn(
                "text-neutral-800",
                HEADING_CLASSES[HeadingComponent],
                props.className
            )}
        >
            {children}
        </HeadingComponent>
    );
};

export default Heading;
