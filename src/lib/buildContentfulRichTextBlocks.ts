import { BLOCKS, Document, Mark } from "@contentful/rich-text-types";

export type NodeTypeKeys = keyof typeof BLOCKS;

export type BlockList = Array<{
    nodeType: NodeTypeKeys;
    value: string;
    marks: Mark[];
}>;

export const buildContentfulRichTextBlocks = (listOfBlocks: BlockList) => {
    const content = listOfBlocks.map(({ marks, nodeType, value }) => {
        return {
            nodeType: BLOCKS[nodeType],
            content: [
                {
                    nodeType: "text",
                    value,
                    marks,
                    data: {},
                },
            ],
            data: {},
        };
    });

    return {
        data: {},
        nodeType: BLOCKS.DOCUMENT,
        content,
    } as Document;
};
