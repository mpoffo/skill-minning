import { Trash2 } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SkillCardProps {
  id: string;
  name: string;
  proficiency: number;
  validated?: boolean;
  onProficiencyChange: (id: string, proficiency: number) => void;
  onDelete: (id: string) => void;
}

export function SkillCard({
  id,
  name,
  proficiency,
  validated = true,
  onProficiencyChange,
  onDelete,
}: SkillCardProps) {
  return (
    <div
      className={cn(
        "group flex items-center justify-between p-default bg-card rounded-big",
        "border border-border hover:shadow-dp04 transition-all duration-200",
        "animate-fade-in"
      )}
    >
      <div className="flex items-center gap-default flex-1 min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-xsmall">
            <span className="text-label font-medium text-foreground truncate">
              {name}
            </span>
            {!validated && (
              <span className="text-small px-xsmall py-xxsmall bg-feedback-attention/20 text-feedback-attention rounded-small">
                Pendente
              </span>
            )}
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-default">
        <StarRating
          value={proficiency}
          onChange={(value) => onProficiencyChange(id, value)}
          showLabel
        />
        
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDelete(id)}
          className="opacity-0 group-hover:opacity-100 transition-opacity text-grayscale-60 hover:text-feedback-error hover:bg-feedback-error/10"
        >
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
