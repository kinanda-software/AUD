"use client";

import { useParams } from "next/navigation";

export default function EngagementPage() {
  const params = useParams();

  const engagementId = params.id as string;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900">
          Engagement
        </h1>

        <p className="mt-2 text-gray-600">
          Engagement ID: {engagementId}
        </p>
      </div>
    </div>
  );
}