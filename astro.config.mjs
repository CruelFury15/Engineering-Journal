import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import mdx from "@astrojs/mdx";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
    site: "https://engineering-journal.apexfury.workers.dev",

    integrations: [
    mdx(),
    sitemap({
        filter: (page) =>
            !page.includes("/search") &&
            !page.includes("/mdx-test")
    })
],

    vite: {
        plugins: [tailwindcss()],
    },
});