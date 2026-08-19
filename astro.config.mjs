import { defineConfig } from "astro/config";
import react from "@astrojs/react";

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  base: process.env.BASE_PATH !== undefined ? process.env.BASE_PATH : '/domenico',
});

