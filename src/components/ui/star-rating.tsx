import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faStar as faStarSolid } from "@fortawesome/free-solid-svg-icons";
import { faStar as faStarRegular } from "@fortawesome/free-regular-svg-icons";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
}

const proficiencyLabels: Record<number, string> = {
  1: "Básico",
  2: "Intermediário",
  3: "Funcional",
  4: "Avançado",
  5: "Especialista",
};

export function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
  showLabel = false,
}: StarRatingProps) {
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const sizeClasses = {
    sm: "text-sm",
    md: "text-lg",
    lg: "text-xl",
  };

  const displayValue = hoverValue ?? value;

  return (
    <div className="flex items-center gap-xsmall">
      <div className="flex gap-xxsmall">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => !readonly && setHoverValue(star)}
            onMouseLeave={() => setHoverValue(null)}
            className={cn(
              "transition-all duration-150",
              !readonly && "hover:scale-110 cursor-pointer",
              readonly && "cursor-default"
            )}
          >
            <FontAwesomeIcon
              icon={star <= displayValue ? faStarSolid : faStarRegular}
              className={cn(
                sizeClasses[size],
                "transition-colors duration-150",
                star <= displayValue
                  ? "text-primary"
                  : "text-grayscale-40"
              )}
            />
          </button>
        ))}
      </div>
      {showLabel && (
        <span className="text-small text-muted-foreground ml-xsmall">
          {proficiencyLabels[displayValue] || ""}
        </span>
      )}
    </div>
  );
}
