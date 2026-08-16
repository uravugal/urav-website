import mongoose, { Schema, model, models, type InferSchemaType } from "mongoose";

/**
 * The contact details shown on /contact.
 *
 * There is only ever **one** of these documents. Rather than storing a
 * collection and hoping nobody adds a second row, every write upserts on the
 * fixed `key` below, so the page can never end up with two competing sets of
 * details.
 *
 * Nothing here is required: an empty field is simply hidden on the public
 * page, which lets a superadmin drop the alternate phone number (say) without
 * needing a schema change.
 */
export const CONTACT_INFO_KEY = "primary";

const contactInfoSchema = new Schema(
  {
    /** Always CONTACT_INFO_KEY — the uniqueness is what makes this a singleton. */
    key: {
      type: String,
      default: CONTACT_INFO_KEY,
      unique: true,
      immutable: true,
    },

    /** Line under the page title. */
    intro: { type: String, default: "", trim: true, maxlength: 400 },

    email: { type: String, default: "", trim: true, lowercase: true },
    /** Optional second address — careers@, support@ and so on. */
    altEmail: { type: String, default: "", trim: true, lowercase: true },

    phone: { type: String, default: "", trim: true },
    altPhone: { type: String, default: "", trim: true },
    /** Shown as a "Chat on WhatsApp" link when set. Digits only, with country code. */
    whatsapp: { type: String, default: "", trim: true },

    /** Free text — line breaks are preserved when rendered. */
    address: { type: String, default: "", trim: true, maxlength: 500 },
    hours: { type: String, default: "", trim: true, maxlength: 200 },

    /** Who last saved the details, for the "last updated" line in the dashboard. */
    updatedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export type ContactInfoDoc = InferSchemaType<typeof contactInfoSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const ContactInfo =
  models.ContactInfo || model("ContactInfo", contactInfoSchema);
