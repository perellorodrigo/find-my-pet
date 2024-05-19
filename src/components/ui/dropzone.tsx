import React, {
    ChangeEvent,
    HTMLProps,
    InputHTMLAttributes,
    useRef,
    useState,
} from "react";
import Image from "next/image";
import { useFormContext } from "react-hook-form";

import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import { useFormField } from "./form";

interface DropzoneProps
    extends Omit<
        React.InputHTMLAttributes<HTMLInputElement>,
        "value" | "onChange"
    > {
    classNameWrapper?: string;
    className?: string;
    dropMessage: string;
    handleOnDrop: (acceptedFiles: FileList | null) => void;
    fileUrl?: string | null;
    allowedTypes?: HTMLProps<HTMLInputElement>["accept"]; //  InputHTMLAttributes<HTMLInputElement>["accept"];
}

const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
    (
        {
            className,
            classNameWrapper,
            dropMessage,
            handleOnDrop,
            allowedTypes,
            fileUrl,
            ...props
        },
        ref
    ) => {
        const inputRef = useRef<HTMLInputElement | null>(null);
        const [previewUrls, setPreviewUrls] = useState<string[]>([]);

        // Function to handle drag over event
        const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            // handleOnDrop(null);
        };

        const refreshPreviewUrls = (files: FileList | null) => {
            previewUrls.forEach((url) => URL.revokeObjectURL(url));
            setPreviewUrls(
                files
                    ? Array.from(files).map((file) => URL.createObjectURL(file))
                    : []
            );
        };

        // Function to handle drop event
        const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
            e.preventDefault();
            e.stopPropagation();
            const { files } = e.dataTransfer;
            if (inputRef.current) {
                inputRef.current.files = files;
                refreshPreviewUrls(files);
                handleOnDrop(files);
            }
        };

        // Function to simulate a click on the file input element
        const handleButtonClick = () => {
            if (inputRef.current) {
                inputRef.current.click();
            }
        };
        return (
            <Card
                ref={ref}
                className={cn(
                    `border-2 border-dashed bg-muted hover:cursor-pointer hover:border-muted-foreground/50`,
                    classNameWrapper
                )}
            >
                <CardContent
                    className="flex flex-col items-center justify-center space-y-2 p-10 text-xs"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={handleButtonClick}
                >
                    <div className="flex items-center justify-center text-muted-foreground">
                        <span className="font-medium">{dropMessage}</span>
                        <Input
                            {...props}
                            value={undefined}
                            ref={inputRef}
                            type="file"
                            className={cn("hidden", className)}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                const files = e.target.files;
                                handleOnDrop(files);
                                refreshPreviewUrls(files);
                            }}
                            accept={allowedTypes}
                        />
                    </div>
                    <div className="flex items-center justify-center gap-3 p-4 relative flex-wrap">
                        {previewUrls.map((url) => (
                            <Image
                                src={url}
                                width={100}
                                height={100}
                                key={url}
                                alt=""
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        );
    }
);

Dropzone.displayName = "Dropzone";

export default Dropzone;
