import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/** Lifecycle of a message, mirroring the tabs on the admin screen. */
export const CONTACT_MESSAGE_STATUSES = [
  "New",
  "Read",
  "Replied",
  "Closed",
] as const;

const contactMessageSchema = new Schema(
  {
    /**
     * Set when the sender was signed in. The contact page is public, so this
     * is empty for most messages and the details below are the only way back
     * to the sender.
     */
    user: { type: Schema.Types.ObjectId, ref: "User", index: true },

    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    subject: { type: String, default: "", trim: true, maxlength: 200 },
    message: { type: String, required: true, trim: true, maxlength: 4000 },

    status: {
      type: String,
      enum: CONTACT_MESSAGE_STATUSES,
      default: "New",
      index: true,
    },

    /** The team's reply, written from the dashboard. */
    reply: { type: String, default: "", trim: true, maxlength: 4000 },
    /** Never leaves the dashboard. */
    internalNote: { type: String, default: "", trim: true, maxlength: 2000 },

    handledBy: { type: Schema.Types.ObjectId, ref: "User" },
    repliedAt: { type: Date },

    /**
     * IST calendar day (`YYYY-MM-DD`) the message was sent on, from
     * `istDayKey()`. This is what the three-per-day check counts, so the
     * limit is a single indexed equality match instead of a date range.
     */
    dayKey: { type: String, required: true, index: true },

    /** Recorded for abuse triage only — never shown on the public site. */
    ip: { type: String, default: "" },
  },
  { timestamps: true }
);

// The quota check: "how many did this address (or this account) send today?"
contactMessageSchema.index({ email: 1, dayKey: 1 });
contactMessageSchema.index({ user: 1, dayKey: 1 });

// The admin list is "newest first, optionally filtered by status".
contactMessageSchema.index({ status: 1, createdAt: -1 });
contactMessageSchema.index({ createdAt: -1 });

export type ContactMessageDoc = InferSchemaType<typeof contactMessageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ContactMessage =
  models.ContactMessage || model("ContactMessage", contactMessageSchema);
