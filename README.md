# About

Repository for: https://www.encontreseupetcanoas.com/

I've developed this website to help pet owners find their lost pets that were rescued by volunteers and sheltered in multiple different places during the floods in my hometown in Brazil. Created with NextJS, utilizing Contentful as CMS and leveraging Shadcn UI components.

This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

1. Create a new account at [contentful.com](https://www.contentful.com)
    1. Create a new _Content Model_ called `pets` with the folowing fields: `title`, `species`, `pictures`, `breed`, `description`, `size`, `gender`, and `color`.
    1. Copy your `Space ID` and `Content Delivery API - access token` from `Settings`
1. Create a [Vercel](https://vercel.com) Project including a `KV Database`
    1. Copy the following secrets from the KV Database: `KV_URL`, `KV_REST_API_URL`, `KV_REST_API_TOKEN`, `KV_REST_API_READ_ONLY_TOKEN`
1. Copy your `.env.sample` to `.env.development.local` and fill all the ENV vars
1. Run the development server:

    ```bash
    npm install
    npm run dev
    ```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.
