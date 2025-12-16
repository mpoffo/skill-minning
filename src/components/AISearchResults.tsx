import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserGroup, faChevronDown } from "@fortawesome/free-solid-svg-icons";
import { AIRankedCandidateCard } from "./AIRankedCandidateCard";

interface CandidateEvidence {
  hard_skills: string[];
  joposition_job_description: string[];
  responsabilities: string[];
  seniority: string;
  certifications: string[];
  language_proficiency: string;
  graduation_postgraduation: string[];
  pdi_feedbacks: string[];
}

interface AICandidate {
  rank: number;
  person_identifier: string;
  match_score: number;
  summary: string;
  evidence: CandidateEvidence;
  confidence: "high" | "medium" | "low";
  gaps: string[];
}

interface AISearchResultsProps {
  candidates: AICandidate[];
}

export function AISearchResults({ candidates }: AISearchResultsProps) {
  const [showMore, setShowMore] = useState(false);

  const topThree = candidates.slice(0, 3);
  const nextFive = candidates.slice(3, 8);
  const hasMore = candidates.length > 3;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-sml">
          <FontAwesomeIcon icon={faUserGroup} className="text-primary" />
          <CardTitle>Top {showMore ? Math.min(candidates.length, 8) : 3} Candidatos</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-sml">
        {/* Top 3 candidates */}
        {topThree.map((candidate) => (
          <AIRankedCandidateCard
            key={candidate.rank}
            candidate={candidate}
          />
        ))}

        {/* Ver mais button */}
        {hasMore && !showMore && (
          <button
            onClick={() => setShowMore(true)}
            className="w-full py-4 px-4 border-2 border-dashed border-border rounded-lg flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all"
          >
            <FontAwesomeIcon icon={faChevronDown} />
            <span className="font-medium">Ver mais {Math.min(nextFive.length, 5)} candidatos</span>
          </button>
        )}

        {/* Additional candidates (positions 4-8) */}
        {showMore && nextFive.map((candidate) => (
          <AIRankedCandidateCard
            key={candidate.rank}
            candidate={candidate}
          />
        ))}
      </CardContent>
    </Card>
  );
}