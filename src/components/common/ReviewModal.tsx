import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Star, Check } from 'lucide-react';
import { Sheet } from '../ui/fmc';

export const ReviewModal: React.FC = () => {
  const { reviewModalBooking, setReviewModalBooking, addReview } = useApp();
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [success, setSuccess] = useState<boolean>(false);

  if (!reviewModalBooking) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      addReview(reviewModalBooking.id, rating, comment);
      setIsSubmitting(false);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setReviewModalBooking(null);
        setComment('');
        setRating(5);
      }, 1000);
    }, 300);
  };

  return (
    <Sheet onClose={() => setReviewModalBooking(null)} title={success ? undefined : 'Votre avis'} label="Votre avis">
      {success ? (
        <div className="py-8 text-center space-y-2">
          <div className="w-14 h-14 bg-[#E6FBEF] dark:bg-fmc-green/15 text-[#007A3D] dark:text-fmc-green rounded-full flex items-center justify-center mx-auto">
            <Check className="w-7 h-7" strokeWidth={3} />
          </div>
          <h3 className="text-[20px] font-bold">Merci pour votre avis</h3>
          <p className="text-[15px] text-slate-500">Il aide les autres clients à choisir leur coach.</p>
        </div>
      ) : (
        <form id="review-form" onSubmit={handleSubmit} className="space-y-5">
          <div className="text-center">
            <h3 className="text-[20px] leading-[25px] font-bold">Comment s'est passée votre séance ?</h3>
            <p className="text-[15px] text-slate-500 mt-1">avec {reviewModalBooking.coachName}</p>
          </div>

          {/* Note : cinq étoiles de 44 px */}
          <div className="flex justify-center items-center gap-1" role="radiogroup" aria-label="Note sur 5">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                role="radio"
                aria-checked={rating === star}
                aria-label={`${star} étoile${star > 1 ? 's' : ''}`}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
                className="apple-press w-11 h-11 flex items-center justify-center cursor-pointer"
              >
                <Star className={`w-8 h-8 ${(hoverRating || rating) >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-300 dark:text-slate-600'}`} />
              </button>
            ))}
          </div>

          <label className="block">
            <span className="block text-[13px] font-semibold text-slate-700 dark:text-slate-300 mb-1.5">Votre commentaire</span>
            <textarea
              id="input-review-comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="La pédagogie, l'intensité, l'écoute du coach…"
              rows={4}
              required
              className="w-full text-[15px] p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-fmc-green/50 resize-none placeholder:text-slate-500"
            />
          </label>

          <button
            id="btn-submit-review"
            type="submit"
            disabled={isSubmitting || !comment.trim()}
            className="apple-press w-full h-12 rounded-full bg-fmc-green disabled:opacity-50 text-fmc-navy text-[15px] font-bold cursor-pointer"
          >
            {isSubmitting ? 'Publication…' : 'Publier mon avis'}
          </button>
        </form>
      )}
    </Sheet>
  );
};
