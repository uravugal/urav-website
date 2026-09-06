"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  BookOpen,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { SkeletonList } from "@/components/ui/Skeleton";
import { FormInput, FormTextarea } from "@/components/ui/Form";
import { api } from "@/lib/client";
import { COURSE_FALLBACK_IMAGE, courseImage } from "@/lib/courseMedia";
import type { CourseItem } from "@/lib/types";

const empty = {
  title: "",
  description: "",
  active: true,
};
type FormState = typeof empty;

export default function AdminCoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CourseItem | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [dropImage, setDropImage] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    api<CourseItem[]>("/api/courses?all=1")
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  function openCreate() {
    setForm(empty);
    setEditing(null);
    setImageFile(null);
    setDropImage(false);
    setError("");
    setOpen(true);
  }

  function openEdit(c: CourseItem) {
    setForm({
      title: c.title,
      description: c.description ?? "",
      active: c.active ?? true,
    });
    setEditing(c);
    setImageFile(null);
    setDropImage(false);
    setError("");
    setOpen(true);
  }

  async function save() {
    setError("");
    if (!form.title.trim()) {
      setError("Title is required.");
      return;
    }

    // The image is optional, so we always send multipart — the API treats a
    // missing `image` field as "leave the current one alone".
    const fd = new FormData();
    fd.append("title", form.title.trim());
    fd.append("description", form.description.trim());
    fd.append("active", String(form.active));
    if (imageFile) fd.append("image", imageFile);
    if (dropImage && !imageFile) fd.append("removeImage", "true");

    setSaving(true);
    try {
      await api(editing ? `/api/courses/${editing._id}` : "/api/courses", {
        method: editing ? "PUT" : "POST",
        body: fd,
      });
      setOpen(false);
      load();
    } catch (e: any) {
      setError(e?.message ?? "Could not save the course.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this course?")) return;
    try {
      await api(`/api/courses/${id}`, { method: "DELETE" });
      setCourses((p) => p.filter((c) => c._id !== id));
    } catch {
      alert("Could not delete the course.");
    }
  }

  async function toggleActive(c: CourseItem) {
    try {
      await api(`/api/courses/${c._id}`, {
        method: "PUT",
        body: JSON.stringify({ active: !c.active }),
      });
      load();
    } catch {
      alert("Could not update the course.");
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-dark">Courses</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage the courses shown on the public site.
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex h-11 items-center gap-2 rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover"
        >
          <Plus className="h-4 w-4" /> Add Course
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {loading ? (
          <SkeletonList rows={4} />
        ) : courses.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-4 font-heading text-lg font-semibold text-dark">No courses yet</p>
            <p className="mt-1 text-sm text-slate-500">
              Until you add one, the site shows "Courses coming soon".
            </p>
          </div>
        ) : (
          courses.map((c) => (
            <div
              key={c._id}
              className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-white p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="flex items-start gap-4">
                <div className="h-16 w-24 shrink-0 overflow-hidden rounded-lg bg-light">
                  <img
                    src={courseImage(c)}
                    alt=""
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = COURSE_FALLBACK_IMAGE;
                    }}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-heading font-semibold text-dark">{c.title}</p>
                    {!c.active && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
                        Inactive
                      </span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-1 line-clamp-1 text-sm text-slate-500">{c.description}</p>
                  )}
                  {!c.imageUrl && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-slate-400">
                      <ImageIcon className="h-3 w-3" /> Default image
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <IconBtn title={c.active ? "Deactivate" : "Activate"} onClick={() => toggleActive(c)}>
                  {c.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </IconBtn>
                <IconBtn title="Edit" onClick={() => openEdit(c)}>
                  <Pencil className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Delete" danger onClick={() => remove(c._id)}>
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={editing ? "Edit Course" : "Add Course"}>
        <div className="space-y-4">
          {error && <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <FormInput label="Title" value={form.title} onChange={(v) => setForm({ ...form, title: v })} required />
          <FormTextarea
            label="Description"
            value={form.description}
            onChange={(v) => setForm({ ...form, description: v })}
            placeholder="What does this course cover?"
          />

          <ImageField
            file={imageFile}
            existing={dropImage ? undefined : editing?.imageUrl}
            onPick={(f) => {
              setImageFile(f);
              if (f) setDropImage(false);
            }}
            onClear={
              editing?.imageUrl && !imageFile && !dropImage
                ? () => setDropImage(true)
                : undefined
            }
          />

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/40"
            />
            Active (visible on the site)
          </label>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setOpen(false)}
              className="h-11 rounded-md border border-slate-200 px-5 text-sm font-medium text-dark hover:bg-light"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="h-11 rounded-md bg-primary px-6 text-sm font-medium text-white hover:bg-primary-hover disabled:opacity-60"
            >
              {saving ? "Saving…" : editing ? "Save changes" : "Create course"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/**
 * Optional thumbnail picker with a live preview. When nothing is chosen the
 * preview shows the placeholder the public site will use.
 */
function ImageField({
  file,
  existing,
  onPick,
  onClear,
}: {
  file: File | null;
  existing?: string;
  onPick: (file: File | null) => void;
  onClear?: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  // Object URLs have to be revoked or the blob stays in memory.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const chosen = preview ?? (existing?.trim() || null);

  return (
    <div>
      <label className="mb-1.5 flex items-center gap-2 text-sm font-medium text-slate-700">
        <ImageIcon className="h-4 w-4" /> Thumbnail image
        <span className="text-xs font-normal text-slate-400">(optional)</span>
      </label>
      <div className="flex items-center gap-4 rounded-md border border-dashed border-slate-300 p-3">
        <div className="h-16 w-24 shrink-0 overflow-hidden rounded bg-light">
          <img
            src={chosen ?? COURSE_FALLBACK_IMAGE}
            alt=""
            className="h-full w-full object-cover"
            onError={(e) => {
              e.currentTarget.src = COURSE_FALLBACK_IMAGE;
            }}
          />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-slate-600">
            Recommended size 1280 × 720 px (16:9 landscape)
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            JPG, PNG or WebP · up to 8MB ·{" "}
            {chosen
              ? "shown on the course cards, so keep the subject centred."
              : "leave this empty and the default course image is used on the site."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium text-dark hover:bg-light"
            >
              <Upload className="h-3.5 w-3.5" />
              {chosen ? "Replace" : "Choose image"}
            </button>
            {file && <span className="truncate text-xs text-slate-500">{file.name}</span>}
            {file && (
              <button
                type="button"
                onClick={() => onPick(null)}
                className="text-xs font-medium text-slate-500 hover:underline"
              >
                Undo
              </button>
            )}
            {!file && onClear && (
              <button
                type="button"
                onClick={onClear}
                className="text-xs font-medium text-danger hover:underline"
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  title,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`grid h-9 w-9 place-items-center rounded-md text-slate-500 transition-colors hover:bg-light ${
        danger ? "hover:text-danger" : "hover:text-primary"
      }`}
    >
      {children}
    </button>
  );
}
