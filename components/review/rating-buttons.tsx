import { Button } from "@/components/ui/button";
import { REVIEW_RATING_LABELS, REVIEW_RATINGS } from "@/lib/review-ratings";

import type { ReviewRating } from "@/lib/review-ratings";

interface RatingButtonsProps {
  isDisabled: boolean;
  onRate: (rating: ReviewRating) => void;
}

export function RatingButtons({ isDisabled, onRate }: RatingButtonsProps) {
  return (
    <div className="rating-row" role="group" aria-label="Bạn nhớ từ này thế nào?">
      {REVIEW_RATINGS.map((rating) => (
        <Button
          key={rating}
          variant={rating === 3 ? "default" : "outline"}
          disabled={isDisabled}
          onClick={() => onRate(rating)}
        >
          {REVIEW_RATING_LABELS[rating]}
        </Button>
      ))}
    </div>
  );
}
