import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Star, X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white border border-slate-200 rounded-3xl p-6 w-full max-w-md shadow-2xl relative text-[#0F172A]"
        >
          <button
            id="btn-close-review-modal"
            onClick={() => setReviewModalBooking(null)}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {success ? (
            <div className="py-6 text-center space-y-2">
              <div className="w-12 h-12 bg-[#00D664]/15 text-[#008A3E] border border-[#00D664]/30 rounded-full flex items-center justify-center mx-auto shadow-xs">
                <Check className="w-6 h-6 stroke-[3]" />
              </div>
              <h3 className="text-lg font-black text-[#0F172A]">Merci pour votre avis !</h3>
              <p className="text-xs text-slate-500">Votre évaluation aide la communauté à choisir les meilleurs coachs.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-[11px] font-extrabold text-[#008A3E] uppercase tracking-wider">Avis de séance</span>
                <h3 className="text-base font-black text-[#0F172A]">Comment s'est passée votre séance ?</h3>
                <p className="text-xs text-slate-500">avec {reviewModalBooking.coachName}</p>
              </div>

              {/* Star Rating */}
              <div className="flex justify-center items-center gap-2 py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                    className="p-1 transition-transform hover:scale-110 focus:outline-none cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-slate-300'
                      }`}
                    />
                  </button>
                ))}
              </div>

              {/* Comment field */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Votre commentaire</label>
                <textarea
                  id="input-review-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Partagez vos impressions sur la pédagogie, l'intensité et l'écoute du coach..."
                  rows={4}
                  required
                  className="w-full text-xs p-3 rounded-xl bg-slate-50 text-slate-900 border border-slate-300 focus:outline-none focus:border-[#00D664] resize-none placeholder:text-slate-400"
                />
              </div>

              <div className="pt-1">
                <button
                  type="submit"
                  disabled={isSubmitting || !comment.trim()}
                  className="w-full py-3 px-4 bg-[#00D664] hover:bg-[#00B050] disabled:opacity-50 text-[#0F172A] font-extrabold rounded-xl transition shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? 'Publication en cours...' : 'Publier mon avis'}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
