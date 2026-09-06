"use client";

import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api } from "@/lib/client";
import { courseImage, COURSE_FALLBACK_IMAGE } from "@/lib/courseMedia";
import { Skeleton, SkeletonCard, SkeletonText } from "@/components/ui/Skeleton";
import type { CourseItem } from "@/lib/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<CourseItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<CourseItem[]>("/api/courses")
      .then(setCourses)
      .catch(() => setCourses([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-light">
        <section className="bg-gradient-to-b from-primary-light/60 to-light">
          <div className="container-page py-12 md:py-16">
            <h1 className="h1 text-dark">Courses</h1>
            <p className="mt-3 max-w-xl text-slate-600">
              Structured learning paths to help you get job-ready.
            </p>
          </div>
        </section>

        <section className="container-page py-10">
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i}>
                  <Skeleton className="h-4 w-2/3" />
                  <SkeletonText className="mt-4" lines={3} />
                </SkeletonCard>
              ))}
            </div>
          ) : courses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-heading text-lg font-semibold text-dark">
                Courses coming soon
              </p>
              <p className="mt-1 text-sm text-slate-500">
                We're putting together our course catalog. Check back shortly.
              </p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {courses.map((c) => (
                <article
                  key={c._id}
                  className="flex flex-col overflow-hidden rounded-xl border border-slate-100 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="h-40 w-full overflow-hidden bg-light">
                    <img
                      src={courseImage(c)}
                      alt={c.title}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = COURSE_FALLBACK_IMAGE;
                      }}
                    />
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="font-heading text-lg font-semibold text-dark">
                      {c.title}
                    </h3>
                    {c.description && (
                      <p className="mt-1.5 line-clamp-3 text-sm text-slate-500">
                        {c.description}
                      </p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}
