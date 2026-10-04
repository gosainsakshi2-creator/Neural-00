import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Three.js objects (geometries, materials, uniforms) are imperative and are mutated every frame
    // inside useFrame by design. React Compiler's immutability rule does not model that, so it is
    // scoped off for scene code only.
    files: ["components/scene/**/*.{ts,tsx}"],
    rules: { "react-hooks/immutability": "off" },
  },
  { ignores: [".next/**", "node_modules/**", "next-env.d.ts"] },
];

export default config;
