/** @type {import('next').NextConfig} */
const nextConfig = {
  // playwright-core must stay external in server bundles — it loads its own
  // modules dynamically and launches the system browser at runtime.
  serverExternalPackages: ['playwright-core'],
};

export default nextConfig;
