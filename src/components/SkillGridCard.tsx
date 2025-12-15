import { Trash2 } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SkillGridCardProps {
  id: string;
  name: string;
  proficiency: number;
  validated?: boolean;
  onProficiencyChange: (id: string, proficiency: number) => void;
  onDelete: (id: string) => void;
}

export function SkillGridCard({
  id,
  name,
  proficiency,
  validated = true,
  onProficiencyChange,
  onDelete,
}: SkillGridCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col p-default bg-card rounded-big",
        "border border-border hover:shadow-dp04 transition-all duration-200",
        "animate-fade-in"
      )}
    >
      {/* Delete button - top right corner */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(id)}
        className="absolute top-xsmall right-xsmall opacity-0 group-hover:opacity-100 transition-opacity text-grayscale-60 hover:text-feedback-error hover:bg-feedback-error/10 h-8 w-8"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Skill name */}
      <div className="flex items-start gap-xsmall mb-sml pr-big">
        <span className="text-label font-medium text-foreground line-clamp-2">
          {name}
        </span>
        {!validated && (
          <span className="text-small px-xsmall py-xxsmall bg-feedback-attention/20 text-feedback-attention rounded-small flex-shrink-0">
            Pendente
          </span>
        )}
      </div>
      
      {/* Star rating */}
      <div className="mt-auto">
        <StarRating
          value={proficiency}
          onChange={(value) => onProficiencyChange(id, value)}
          size="md"
        />
      </div>
    </div>
  );
}
