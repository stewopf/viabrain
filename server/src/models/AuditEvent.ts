import mongoose, { Schema, type InferSchemaType } from "mongoose";

const auditSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    username: { type: String, required: true },
    action: { type: String, required: true, index: true },
    resourceType: { type: String },
    resourceId: { type: String },
    detail: { type: Schema.Types.Mixed },
    repoShas: {
      type: [
        {
          repoId: String,
          sha: String,
          fullName: String,
        },
      ],
      default: [],
    },
    ip: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type AuditEventDoc = InferSchemaType<typeof auditSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const AuditEvent = mongoose.model("AuditEvent", auditSchema);
