/** @type {import('next').NextConfig} */
const onCloudflare = process.env.CF_PAGES === '1';
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  basePath: onCloudflare ? '' : '/covenant',
  trailingSlash: true,
};
module.exports = nextConfig;
