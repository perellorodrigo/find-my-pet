import { createReadStream } from "fs";
import * as path from "path";
import * as csv from "@fast-csv/parse";
import { Entry } from "contentful";
import { Asset, createClient } from "contentful-management";
import * as dotenv from "dotenv";

import {
	BlockList,
	buildContentfulRichTextBlocks,
} from "../src/lib/buildContentfulRichTextBlocks";
import { PetSkeleton } from "../src/lib/types";

dotenv.config({ path: __dirname + "/.env" });

//Espécie	Fotos	Telefone para Contato ou Instagram	Endereço	Raça	Porte	Sexo	Cor	Informações adicionais	Email Address
type CSV_Row = {
	Timestamp: string;
	Espécie: string;
	Fotos: string;
	"Telefone para Contato ou Instagram": string;
	Endereço: string;
	Raça: string;
	Porte: string;
	Sexo: string;
	Cor: string;
	"Informações adicionais": string;
	"Email Address": string;
};

type PetFields = Entry<PetSkeleton>["fields"];

const readFromCSV = async (filePath: string): Promise<CSV_Row[]> => {
	let currentRows: CSV_Row[] = [];

	const csvFileStream = createReadStream(
		path.resolve(__dirname, "input", filePath)
	).pipe(csv.parse({ headers: true }));

	return new Promise((resolve, reject) => {
		csvFileStream
			.on("error", (error: string) => console.error(error))
			.on("data", (row: CSV_Row) => {
				currentRows.push(row);
			})
			.on("end", () => {
				resolve(currentRows);
			});
	});
};

const getPetsFromCsv = async () => {
	if (
		!process.env.CONTENTFUL_MANAGEMENT_API_KEY ||
		!process.env.CONTENTFUL_SPACE_ID
	) {
		console.error(
			"Missing Contentful Management API Key OR Space ID. Please check your .env file under ./scripts/.env"
		);

		return;
	}

	console.log(
		"Running get pets from CSV: ",
		process.env.CONTENTFUL_MANAGEMENT_API_KEY
	);

	const managementClient = createClient({
		accessToken: process.env.CONTENTFUL_MANAGEMENT_API_KEY || "",
	});

	const client = await managementClient.getSpace(
		process.env.CONTENTFUL_SPACE_ID
	);

	const environment = await client.getEnvironment("master");

	const csvRows = await readFromCSV(__dirname + "/input/pets.csv");

	for (const [index, row] of csvRows.entries()) {
		console.log("Uploading row ", index + 1, " of ", csvRows.length);

		const uploadedAssets: Asset[] = [];

		const photoList = row.Fotos.split(",");
		for (const [index, photo] of photoList.entries()) {
			console.log(
				`Processando foto ${index} de ${photoList.length}. Foto: ${photo}`
			);

			try {
				const queryParams = new URLSearchParams(photo.split("?")[1]);
				const photoId = queryParams.get("id");
				const downloadURL = `https://drive.usercontent.google.com/download?id=${photoId}`;

				const fileHead = await fetch(downloadURL, {
					method: "HEAD",
				});

				const contentType =
					fileHead.headers.get("content-type") || "image/jpeg";
				const contentLength = fileHead.headers.get("content-length");

				if (contentLength === "0") {
					console.log("Skipping empty file");
					continue;
				}

				const fileExtension = contentType.split("/").at(-1) || "jpg";

				const asset = await environment.createAsset({
					fields: {
						title: {
							"en-US": photo,
						},
						file: {
							"en-US": {
								contentType: contentType,
								fileName: `${photoId}.${fileExtension}`,
								upload: downloadURL,
							},
						},
					},
				});

				const uploadedAsset = await asset.processForLocale("en-US", {
					processingCheckWait: 1000,
				});

				await uploadedAsset.publish();

				uploadedAssets.push(uploadedAsset);
			} catch (error) {
				console.error("Error uploading asset: ", photo, "\n Error: ", error);
			}
		}

		if (uploadedAssets.length === 0) {
			console.log("Skipping entry due to no assets: ", index);
			continue;
		}

		const richTextBlocks: BlockList = [];

		if (row["Endereço"]) {
			richTextBlocks.push({
				nodeType: "PARAGRAPH",
				value: `Localização: ${row["Endereço"]}`,
				marks: [],
			});
		}

		if (row["Telefone para Contato ou Instagram"]) {
			richTextBlocks.push({
				nodeType: "PARAGRAPH",
				value: `Contato: ${row["Telefone para Contato ou Instagram"]}`,
				marks: [],
			});
		}

		if (row["Informações adicionais"]) {
			richTextBlocks.push({
				nodeType: "PARAGRAPH",
				value: `Informações adicionais: ${row["Informações adicionais"]}`,
				marks: [],
			});
		}

		const entryFields: PetFields = {
			title: {
				"en-US": `Forms - ${row["Timestamp"]}`,
			},
			pictures: {
				"en-US": uploadedAssets.map((asset) => ({
					sys: {
						type: "Link",
						linkType: "Asset",
						id: asset.sys.id,
					},
				})),
			},
			species: {
				"en-US": row["Espécie"],
			},
			breed: {
				"en-US": (row["Raça"] || "Vira Lata").trim(),
			},
			color: {
				"en-US": (row["Cor"] || "").trim(),
			},
			description: {
				"en-US": buildContentfulRichTextBlocks(richTextBlocks),
			},
			size: {
				"en-US": row["Porte"],
			},
			gender: {
				"en-US": (row["Sexo"] || "indefinido").trim(),
			},
		};

		const result = await environment.createEntry("pet", {
			fields: entryFields,
		});

		console.log("entry: ", result);
	}
};

getPetsFromCsv();
