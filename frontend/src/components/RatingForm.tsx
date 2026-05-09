import React, { useState, useEffect } from 'react';
import StarRating from './StarRating';
import { ratingsService, RatingType, CreateRatingDto } from '../services/ratings.service';
import './StarRating.css';

interface RatingFormProps {
  entityId: string;
  entityName: string;
  ratingType: RatingType;
  onSuccess?: () => void;
  onCancel?: () => void;
}

const RatingForm: React.FC<RatingFormProps> = ({
  entityId,
  entityName,
  ratingType,
  onSuccess,
  onCancel,
}) => {
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const dto: CreateRatingDto = {
        ratingType,
        entityId,
        rating,
        feedback: feedback.trim() || undefined,
        isAnonymous,
      };

      await ratingsService.submitRating(dto);
      setSuccess(true);
      
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to submit rating');
    } finally {
      setLoading(false);
    }
  };

  const getRatingTypeLabel = () => {
    switch (ratingType) {
      case RatingType.COURSE:
        return 'Course';
      case RatingType.TEACHER:
        return 'Teacher';
      case RatingType.CONTENT:
        return 'Content';
      default:
        return '';
    }
  };

  if (success) {
    return (
      <div className="rating-form">
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>✓</div>
          <h3 style={{ color: '#10b981', marginBottom: '8px' }}>Rating Submitted!</h3>
          <p style={{ color: '#64748b' }}>Thank you for your feedback</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rating-form">
      <h3>Rate this {getRatingTypeLabel()}</h3>
      <p style={{ color: '#64748b', marginBottom: '20px' }}>{entityName}</p>

      {error && (
        <div style={{ 
          padding: '12px', 
          background: '#fee2e2', 
          color: '#991b1b', 
          borderRadius: '8px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="rating-form-group">
          <label>Your Rating *</label>
          <StarRating
            rating={rating}
            onRatingChange={setRating}
            size="large"
            showValue={false}
          />
        </div>

        <div className="rating-form-group">
          <label>Feedback (Optional)</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your thoughts..."
            maxLength={500}
          />
          <small style={{ color: '#94a3b8', fontSize: '12px' }}>
            {feedback.length}/500 characters
          </small>
        </div>

        <div className="checkbox-group">
          <input
            type="checkbox"
            id="anonymous"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
          />
          <label htmlFor="anonymous">Submit anonymously</label>
        </div>

        <div className="rating-form-actions">
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={loading}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || rating === 0}
          >
            {loading ? 'Submitting...' : 'Submit Rating'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default RatingForm;
