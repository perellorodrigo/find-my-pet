/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        unoptimized: true,
        // Contentful image API
        remotePatterns: [
            {
              protocol: 'https',
              hostname: 'images.ctfassets.net',
              port: '',
            },
          ],
    },
    
};

export default nextConfig;
