import { Star } from "lucide-react";

interface DisplayProps {
  rating: number;
  count?: number;
  size?: number;
  showCount?: boolean;
}

export function StarRating({ rating, count, size = 14, showCount = true }: DisplayProps) {
  const rounded = Math.round(rating);
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((i) => (
          <Star
            key={i}
            size={size}
            className={i <= rounded ? "fill-amber-accent text-amber-accent" : "fill-coffee-100 text-coffee-200"}
          />
        ))}
      </div>
      {showCount && (
        <span className="text-xs text-coffee-400">
          {rating > 0 ? rating.toFixed(1) : "New"}
          {typeof count === "number" && count > 0 ? ` (${count})` : ""}
        </span>
      )}
    </div>
  );
}

export function StarRatingInput({ value, onChange, size = 24 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          className="transition hover:scale-110"
        >
          <Star size={size} className={i <= value ? "fill-amber-accent text-amber-accent" : "fill-coffee-100 text-coffee-200"} />
        </button>
      ))}
    </div>
  );
}
