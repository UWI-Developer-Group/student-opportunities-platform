import mongoose, { Model, Schema, SchemaOptions } from "mongoose";

// Shared options for all schemas.
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  versionKey: false,
};

// Reuses existing models to prevent errors during hot reloads.
export function getOrCreateModel<T>(name: string, schema: Schema<T>): Model<T> {
  return (mongoose.models[name] as Model<T>) ?? mongoose.model<T>(name, schema);
}

// Gets enum values from an object.
export function enumValues<T extends Record<string, string>>(obj: T) {
  return Object.values(obj) as T[keyof T][];
}