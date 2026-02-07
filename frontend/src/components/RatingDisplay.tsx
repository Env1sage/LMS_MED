import React, { useEffect, useState } from 'react';
import StarRating from './StarRating';
import { ratingsService, RatingType, RatingStats } from '../services/ratings.service';
import './StarRating.css';

interface RatingDisplayProps {
  entityId: string;
  ratingType: RatingType;
}

const RatingDisplay: React.FC<RatingDisplayProps> = ({ entityId, ratingType }) => {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRatings();
  }, [entityId, ratingType]);

  const fetchRatings = async () => {
    try {
      setLoading(true);
      const data = await ratingsService.getEntityRatings(ratingType, entityId);
      setStats(data);
    } catch (err) {
      console.error('Error fetching ratings:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div>Loading ratings...</div>;
  }

  if (!stats || stats.totalRatings === 0) {
    return (
      <div className="rating-display">
        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '20px' }}>
          No ratings yet
        </p>
      </div>
    );
  }

  const calculatePercentage = (count: number) => {
    return stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
  };

  return (
    <div className="rating-display">
      <div className="rating-summary">
        <div>
          <div className="rating-big-number">{stats.averageRating}</div>
          <StarRating rating={stats.averageRating} readonly size="medium" showValue={false} />
          <div className="rating-meta">{stats.totalRatings} rating{stats.totalRatings !== 1 ? 's' : ''}</div>
        </div>
        
        <div className="rating-distribution" style={{ flex: 1 }}>
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star} className="distribution-row">
              <div className="distribution-label">{star}★</div>
              <div className="distribution-bar">
                <div 
                  className="distribution-fill" 
                  style={{ width: `${calculatePercentage(stats.distribution[star as keyof typeof stats.distribution])}%` }}
                />
              </div>
              <div className="distribution-count">{stats.distribution[star as keyof typeof stats.distribution]}</div>
            </div>
          ))}
        </div>
      </div>

      {stats.feedbackList && stats.feedbackList.length > 0 && (
        <div className="feedback-list">
          <h4>Recent Feedback</h4>
          {stats.feedbackList.slice(0, 10).map((item, index) => (
            <div key={index} className="feedback-item">
              <div className="feedback-header">
                <div>
                  <span className="feedback-author">{item.studentName}</span>
                  <StarRating rating={item.rating} readonly size="small" showValue={false} />
                </div>
                <span className="feedback-date">
                  {new Date(item.createdAt).toLocaleDateString()}
                </span>
              </div>
              {item.feedback && <div className="feedback-text">{item.feedback}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RatingDisplay;
