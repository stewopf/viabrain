import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    passwordHash: { type: String, required: true },
    // Okta SSO later: store Okta `sub` here and issue the same JWT cookie after OIDC.
    oktaSub: { type: String, sparse: true, unique: true },
  },
  { timestamps: true, collection: "viabrainUsers" },
);

export type UserDoc = InferSchemaType<typeof userSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const User = mongoose.model("User", userSchema);
