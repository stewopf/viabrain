import mongoose, { Schema, type InferSchemaType } from "mongoose";

const citationSchema = new Schema(
  {
    repoId: { type: String },
    path: { type: String, required: true },
    raw: { type: String, required: true },
  },
  { _id: false },
);

const messageSchema = new Schema(
  {
    chatId: { type: Schema.Types.ObjectId, ref: "Chat", required: true, index: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    citations: { type: [citationSchema], default: [] },
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
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

export type MessageDoc = InferSchemaType<typeof messageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Message = mongoose.model("Message", messageSchema);
