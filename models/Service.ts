import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const serviceSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    /**
     * Full explanation shown on the service's own detail page. Kept
     * separate from `description` (the short blurb used on the card
     * grid) so the listing page doesn't get overloaded with a wall of
     * text.
     */
    details: { type: String, default: "" },
    /**
     * Thumbnail (S3). Empty when the admin hasn't uploaded one yet — the UI
     * then falls back to the built-in placeholder, so this is never
     * required.
     */
    imageUrl: { type: String, default: "" },
    imageKey: { type: String, default: "" },
    active: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

export type ServiceDoc = InferSchemaType<typeof serviceSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Service = models.Service || model("Service", serviceSchema);
