import React from 'react';
import { Button } from "@/components/ui/button";

interface InternalReviewSectionProps {
  reviewedDate: string;
  coaOpinion: string;
  coaComment: string;
  isEndorsed?: boolean;
  onEndorse?: () => void;
  showEndorseButton?: boolean;
}

export default function InternalReviewSection({
  reviewedDate,
  coaOpinion,
  coaComment,
  isEndorsed = false,
  onEndorse,
  showEndorseButton = true
}: InternalReviewSectionProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header with reviewed date */}
      <div className="flex justify-between items-center">
        <h3 className="text-base font-medium text-gray-700">
          <span className="text-gray-600">Reviewed on:</span> {reviewedDate}
        </h3>
        {showEndorseButton && (
          isEndorsed ? (
            <span className="text-sm bg-gray-100 text-gray-600 px-4 py-2 rounded-md">
              Endorsed
            </span>
          ) : (
            <Button
              onClick={onEndorse}
              className="bg-green-600 hover:bg-green-700 text-white px-6"
            >
              Endorse to OSLD
            </Button>
          )
        )}
      </div>

      {/* COA Opinion */}
      <div>
        <label className="text-sm font-semibold text-gray-900 mb-2 block">
          COA Opinion:
        </label>
        <div className="text-base text-gray-900">
          {coaOpinion}
        </div>
      </div>

      {/* COA Comment */}
      <div>
        <label className="text-sm font-semibold text-gray-900 mb-2 block">
          COA Comment:
        </label>
        <div className="text-base text-gray-700 leading-relaxed">
          {coaComment || "No comment provided"}
        </div>
      </div>
    </div>
  );
}
