import mongoose, { Schema, type InferSchemaType } from "mongoose";

const chatSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true, trim: true, default: "New chat" },
    repoIds: {
      type: [String],
      required: true,
      validate: [(v: string[]) => v.length > 0, "At least one repo required"],
    },
    playbookId: { type: String },
    cursorAgentId: { type: String },
  },
  { timestamps: true },
);

export type ChatDoc = InferSchemaType<typeof chatSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Chat = mongoose.model("Chat", chatSchema);

export function resolveChatRepoIds(chat: {
  repoIds?: string[] | null;
  repoId?: string | null;
}): string[] {
  if (Array.isArray(chat.repoIds) && chat.repoIds.length > 0) {
    return chat.repoIds;
  }
  if (chat.repoId) return [chat.repoId];
  return [];
}
