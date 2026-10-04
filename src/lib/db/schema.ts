import { Schema } from "mongoose";

export const objectId = Schema.Types.ObjectId;

export const auditFields = {
  createdAt: { type: Date, default: Date.now, immutable: true },
  updatedAt: { type: Date, default: Date.now },
};

export function withTimestamps(schema: Schema) {
  schema.set("timestamps", true);
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform: (_doc, result) => {
      delete result._id;
      return result;
    },
  });
  return schema;
}
