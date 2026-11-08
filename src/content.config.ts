import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { defineCollection, reference } from "astro:content";

const blog = defineCollection({
    loader: glob({
        base: "./src/content/blog",
        pattern: "**/*.{md,mdx}"
    }),

    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),
        tags: z.array(z.string()).default([]),
        draft: z.boolean().default(false),
        topics: z.array(reference("topics")).default([]),
        featured: z.boolean().default(false),
        updatedDate: z.coerce.date().optional(),
    })
});
const projects = defineCollection({
    loader: glob({
        base: "./src/content/projects",
        pattern: "**/*.{md,mdx}"
    }),

    schema: z.object({
        title: z.string(),
        description: z.string(),
        pubDate: z.coerce.date(),

        tags: z.array(z.string()).default([]),

        techStack: z.array(z.string()),

        status: z.enum([
            "completed",
            "in-progress",
            "archived"
        ]),
        

        repoUrl: z.string().url().optional(),
        demoUrl: z.string().url().optional(),
        topics: z.array(reference("topics")).default([]),
        featured: z.boolean().default(false)
    }),
    
});
const topics = defineCollection({
    loader: glob({
        base: "./src/content/topics",
        pattern: "**/*.{md,mdx}"
    }),

    schema: z.object({
        title: z.string(),
        description: z.string(),
        category: z.string(),
        featured: z.boolean().default(false),
    })
});

export const collections = {
    blog,
    projects,
    topics
};