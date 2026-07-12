import mongoose, { Schema, type InferSchemaType } from "mongoose";

const repoSyncSchema = new Schema(
  {
    repoId: { type: String, required: true, unique: true },
    fullName: { type: String, required: true },
    branch: { type: String, default: "main" },
    sha: { type: String },
    syncedAt: { type: Date },
    lastError: { type: String },
    status: {
      type: String,
      enum: ["never", "ok", "error", "syncing"],
      default: "never",
    },
  },
  { timestamps: true },
);

export type RepoSyncDoc = InferSchemaType<typeof repoSyncSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const RepoSync = mongoose.model("RepoSync", repoSyncSchema);
