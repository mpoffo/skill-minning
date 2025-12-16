import { Trash2 } from "lucide-react";
import { StarRating } from "@/components/ui/star-rating";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RequiredSkillCardProps {
  name: string;
  proficiency: number;
  onProficiencyChange: (name: string, proficiency: number) => void;
  onDelete: (name: string) => void;
}

export function RequiredSkillCard({
  name,
  proficiency,
  onProficiencyChange,
  onDelete,
}: RequiredSkillCardProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col p-default bg-card rounded-big min-h-[100px]",
        "border border-border hover:shadow-dp04 transition-all duration-200",
        "animate-fade-in"
      )}
    >
      {/* Delete button - top right corner */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onDelete(name)}
        className="absolute top-xsmall right-xsmall opacity-0 group-hover:opacity-100 transition-opacity text-grayscale-60 hover:text-feedback-error hover:bg-feedback-error/10 h-8 w-8"
      >
        <Trash2 className="w-4 h-4" />
      </Button>

      {/* Skill name with tooltip */}
      <div className="flex-1 pr-big mb-sml">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-label font-medium text-foreground block truncate cursor-default">
                {name}
              </span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{name}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      
      {/* Star rating with label */}
      <div className="mt-auto">
        <StarRating
          value={proficiency}
          onChange={(value) => onProficiencyChange(name, value)}
          size="md"
          showLabel
        />
      </div>
    </div>
  );
}
