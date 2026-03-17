/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Permitir build en producción incluso con errores de tipo (temporal)
    ignoreBuildErrors: true,
  },
  eslint: {
    // Permitir build en producción incluso con warnings de ESLint
    ignoreDuringBuilds: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  webpack: (config, { isServer }) => {
    // Configuración para pdf-parse
    config.resolve.alias.canvas = false;
    config.resolve.alias['pdfjs-dist'] = false;
    
    // Excluir módulos solo en el cliente
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        canvas: false,
      };
    }
    
    // Ignorar warnings de módulos opcionales
    config.ignoreWarnings = [
      { module: /node_modules\/canvas/ },
      { module: /node_modules\/pdfjs-dist/ },
    ];
    
    return config;
  },
};

export default nextConfig;
