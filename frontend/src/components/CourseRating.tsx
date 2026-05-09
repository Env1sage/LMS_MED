import React, { useState } from 'react';
import { Star } from 'lucide-react';

interface RatingProps {
  courseId: number;
  facultyId?: number;
  currentRating?: number;
  onRatingSubmit?: (rating: number) => void;
}

const CourseRating: React.FC<RatingProps> = ({ courseId, facultyId, currentRating = 0, onRatingSubmit }) => {
  const [rating, setRating] = useState(currentRating);
  const [hoverRating, setHoverRating] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingClick = async (selectedRating: number) => {
    setRating(selectedRating);
    setIsSubmitting(true);

    if (onRatingSubmit) {
      try {
        await onRatingSubmit(selectedRating);
      } catch (error) {
        console.error('Error submitting rating:', error);
      } finally {
        setIsSubmitting(false);
      }
    } else {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ display: 'flex', gap: 2 }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => handleRatingClick(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <Star
              size={18}
              fill={star <= (hoverRating || rating) ? 'var(--bo-warning)' : 'none'}
              stroke={star <= (hoverRating || rating) ? 'var(--bo-warning)' : 'var(--bo-border)'}
              style={{ transition: 'all 0.2s' }}
            />
          </button>
        ))}
      </div>
      <span style={{ fontSize: 12, color: 'var(--bo-text-muted)' }}>
        {rating > 0 ? `${rating}/5` : 'Rate teacher'}
      </span>
    </div>
  );
};

export default CourseRating;
