/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
    // Next's build-time file tracing can't detect the dynamic
    // fs.readFileSync() calls in lib/fonts.ts, so it excludes the font
    // files from the deployed function bundle unless told explicitly.
    outputFileTracingIncludes: {
      '/api/calendar.bmp': [
        './node_modules/@fontsource/roboto-mono/files/*.woff',
        './node_modules/@fontsource/merriweather/files/*.woff',
        './node_modules/@fontsource/inter/files/*.woff',
      ],
    },
  },
};

module.exports = nextConfig;
