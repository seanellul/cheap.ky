import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
export type DB = typeof db;

// Raw SQL query function for dynamic queries with $1, $2 placeholders
export async function rawSql(query: string, params?: unknown[]): Promise<Record<string, unknown>[]> {
  return sql.query(query, params) as Promise<Record<string, unknown>[]>;
}

// Tagged template for simple static queries
export const taggedSql = sql;
