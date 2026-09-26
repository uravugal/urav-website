"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Sparkles } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { api, ApiError } from "@/lib/client";
import { serviceImage, SERVICE_FALLBACK_IMAGE } from "@/lib/serviceMedia";
import { Skeleton, SkeletonText } from "@/components/ui/Skeleton";
import type { ServiceItem } from "@/lib/types";

export default function ServiceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    api<ServiceItem>(`/api/services/${id}`)
      .then(setService)
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
            href="/services"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" /> Back to services
          </Link>

          {loading ? (
            <div className="mt-6 space-y-4 rounded-2xl border border-slate-100 bg-white p-6">
              <Skeleton className="h-56 w-full rounded-xl" />
              <Skeleton className="h-8 w-2/3" />
              <SkeletonText lines={6} />
            </div>
          ) : notFound || !service ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Sparkles className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-4 font-heading text-lg font-semibold text-dark">
                This service isn&apos;t available
              </p>
              <p className="mt-1 text-sm text-slate-500">
                It may have been removed or made inactive.
              </p>
              <Link
                href="/services"
                className="mt-5 inline-flex h-10 items-center rounded-md bg-primary px-5 text-sm font-medium text-white hover:bg-primary-hover"
              >
                Browse other services
              </Link>
            </div>
          ) : (
            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
              <div className="h-56 w-full overflow-hidden bg-light sm:h-72">
                <img
                  src={serviceImage(service)}
                  alt={service.title}
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = SERVICE_FALLBACK_IMAGE;
                  }}
                />
              </div>

              <div className="p-6 sm:p-8">
                <h1 className="font-heading text-2xl font-bold text-dark">
                  {service.title}
                </h1>

                {service.description && (
                  <p className="mt-2 text-slate-600">{service.description}</p>
                )}

                {service.details && (
                  <div className="mt-6 border-t border-slate-100 pt-6">
                    <h2 className="font-heading text-lg font-semibold text-dark">
                      About this service
                    </h2>
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-600">
                      {service.details}
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
