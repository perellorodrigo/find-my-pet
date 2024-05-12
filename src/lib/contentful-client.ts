import "server-only";
import { createClient } from "contentful";

if (
	!process.env.CONTENTFUL_SPACE_ID ||
	!process.env.CONTENTFUL_DELIVERY_API_KEY
) {
	throw new Error("Missing Contentful API keys");
}

const contentfulClient = createClient({
	// This is the space ID. A space is like a project folder in Contentful terms
	space: process.env.CONTENTFUL_SPACE_ID,
	// This is the access token for this space. Normally you get both ID and the token in the Contentful web app
	accessToken: process.env.CONTENTFUL_DELIVERY_API_KEY,
});

export default contentfulClient;
