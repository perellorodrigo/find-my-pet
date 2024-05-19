import type { ChatCompletionCreateParamsNonStreaming } from "openai/resources/index.mjs";

const jsonMock = {
	gender:
		"<the gender of the pet if written in the image, macho for male, fêmea for female, and indefinido if you can't identify.",
	species:
		"<The species of the pet, if dog return Cachorro, if cat return Gato>",
	text: "<The full text description of the pet, combining all the requested details>",
	predominant_color: "<The predominant color of the pet>",
	additional_colors: "<Any additional colors of the pet>",
	breed:
		"<The pet breed, if mixed, output in the format Vira Lata / <predominant breed that is mixed with>. Be assertive, do not use words like possibly or maybe!>",
	color:
		"<The color of the pet, if two provide in the format <predominant color> e <secondary color>, if three or more, provide them separated by a slash: like Black / White / Grey>. Always capitalize the first letter of each color.>",
	size: "<The size of the pet, PP for very small, P for small, M for medium and G for big. Do not return a combination of sizes, be assertive>",
	eye_color: "<The eye color of the pet, don't specify expression>",
	fur_length: "<The fur length of the pet>",
	fur_pattern:
		"<The fur pattern of the pet, if applicable, if not applicable return null>",
	face_description: "<The face description of the pet, be very detailed>",
	body_description:
		"<The body description of the pet, be very detailed, if unabled to detect from picture, return null>",
} as const;

export type OpenAIResponse = {
	[key in keyof typeof jsonMock]: string;
};

export const getImagePrompt = ({
	imageUrl,
}: {
	imageUrl: string;
}): ChatCompletionCreateParamsNonStreaming => ({
	model: "gpt-4o",
	response_format: {
		type: "json_object",
	},
	messages: [
		{
			role: "system",
			content: `
            You are a helpful assistant that generates description of pets based on a user input image.
            You provide answers in JSON format (without using Markdown code blocks or any other formatting).
            The JSON structure should be as follows:
            ${JSON.stringify(jsonMock)}
            `,
		},
		{
			role: "assistant",
			content: `Provide your answer in brazilian portuguese`,
		},
		{
			role: "user",
			content: [
				{
					type: "text",
					text: "Me descreva esse pet detalhadamente. Se a raça for uma mistura, cite traços de quais raças pode ser. Não incluir na resposta Informações sobre coleira ou o ambiente em que o pet está.",
				},
				{
					type: "image_url",
					image_url: {
						detail: "high",
						url: imageUrl,
					},
				},
			],
		},
	],
});
