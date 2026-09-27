"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api, ApiError } from "@/lib/client";
import { courseImage, COURSE_FALLBACK_IMAGE } from "@/lib/courseMedia";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import type { CourseItem } from "@/lib/types";

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [course, setCourse] = useState<CourseItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api<CourseItem>(`/api/courses/${id}`)
      .then(setCourse)
      .catch((e) => {
        if (e instanceof ApiError && e.status === 404) setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light">
        <div className="container-page py-8">
          <Link
            href="/courses"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to courses
          </Link>

          {loading ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-8 w-2/3" />
              <SkeletonText lines={6} />
            </div>
          ) : notFound || !course ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-heading text-lg font-semibold text-dark">
                This course isn&apos;t available
              </p>
              <p className="mt-1 text-sm text-slate-500">
                It may have been removed or made inactive.
              </p>
              <Link
                href="/courses"
                className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Browse other courses
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="h-56 w-full overflow-hidden bg-light sm:h-72">
                <img
                  src={courseImage(course)}
                  alt={course.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = COURSE_FALLBACK_IMAGE;
                  }}
                />
              </div>

              <div className="p-6 sm:p-8">
                <h1 className="font-heading text-2xl font-bold text-dark">
                  {course.title}
                </h1>

                {course.description && (
                  <p className="mt-2 text-slate-600">{course.description}</p>
                )}

                {course.details && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h2 className="font-heading text-lg font-semibold text-dark">
                      Course details
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {course.details}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
