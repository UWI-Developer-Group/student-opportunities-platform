import { z } from "zod";

const envSchema = z.object({
  MONGODB_URI: z.string().url(),
  APP_URL: z.string().url(),
});

export type AppEnv = z.infer<typeof envSchema>;

export function getEnv(): AppEnv {
  return envSchema.parse({
    MONGODB_URI: process.env.MONGODB_URI,
    APP_URL: process.env.APP_URL,
  });
}
