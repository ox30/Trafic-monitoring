/// <reference types="vite/client" />

// Déclaration pour les imports de fichiers GeoJSON
declare module '*.geojson' {
  const value: GeoJSON.FeatureCollection;
  export default value;
}

// Déclaration pour les imports SVG
declare module '*.svg' {
  const content: string;
  export default content;
}

