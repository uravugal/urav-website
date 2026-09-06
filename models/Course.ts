import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

const courseSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
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

export type CourseDoc = InferSchemaType<typeof courseSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Course = models.Course || model("Course", courseSchema);
