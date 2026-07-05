/// <reference path="../../cloudflare-env.d.ts" />
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { z } from "zod";

const postSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().default(""),
  body: z.string().default(""),
  created_at: z.number(),
  updated_at: z.number(),
});

const postSummarySchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  excerpt: z.string().default(""),
  created_at: z.number(),
});

function getDB(): D1Database {
  const ctx = getCloudflareContext();
  const db = ctx.env.DB;
  if (!db) {
    throw new Error("D1 DB binding is not available");
  }
  return db;
}

export async function listPosts(limit = 50): Promise<z.infer<typeof postSummarySchema>[]> {
  const db = getDB();
  const result = await db
    .prepare(
      "SELECT id, title, slug, excerpt, created_at FROM posts ORDER BY created_at DESC LIMIT ?1",
    )
    .bind(limit)
    .all();
  const parsed = z.array(postSummarySchema).safeParse(result.results);
  if (!parsed.success) {
    return [];
  }
  return parsed.data;
}

export async function readPost(slug: string): Promise<z.infer<typeof postSchema> | null> {
  const db = getDB();
  const result = await db
    .prepare(
      "SELECT id, title, slug, excerpt, body, created_at, updated_at FROM posts WHERE slug = ?1",
    )
    .bind(slug)
    .first();
  if (!result) {
    return null;
  }
  const parsed = postSchema.safeParse(result);
  if (!parsed.success) {
    return null;
  }
  return parsed.data;
}
