import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cette ligne doit rester commentée pour permettre les API routes
  // output: 'export',  
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  turbopack: {
    rules: {
      '*.svg': {
        loaders: ['@svgr/webpack'],
        as: '*.js',
      },
    },
  },
  
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Server-side: externalize native modules
      if (!config.externals) {
        config.externals = [];
      }
      
      if (Array.isArray(config.externals)) {
        config.externals.push(
          'canvas',
          '@napi-rs/canvas',
          'pdf-parse'
        );
      }
    } else {
      // Client-side: disable these modules
      config.resolve = config.resolve || {};
      config.resolve.alias = {
        ...config.resolve.alias,
        canvas: false,
        '@napi-rs/canvas': false,
        'pdf-parse': false,
        'pdfjs-dist': false,
      };
      
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    
    // Re-enable minification for proper API route handling
    // config.optimization = {
    //   ...config.optimization,
    //   minimize: false,
    // };
    
    return config;
  },
  
  env: {
    PDFJS_DISABLE_WORKER: 'true',
  },
};

export default nextConfig;
