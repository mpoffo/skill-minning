import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faTriangleExclamation,
  faLightbulb,
  faClipboardCheck,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AIInsights {
  understood_request: {
    role: string;
    seniority: string;
    must_have: string[];
    nice_to_have: string[];
    context: string;
  };
  clarifying_questions: string[];
  risks_and_gaps_overall: string[];
  assumptions_made: string[];
  next_steps: {
    suggested_interview_checks: string[];
    suggested_filters_to_refine: string[];
  };
}

interface AIInsightsCardProps {
  insights: AIInsights;
}

export function AIInsightsCard({ insights }: AIInsightsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-sml">
          <FontAwesomeIcon icon={faLightbulb} className="text-primary" />
          Insights da IA
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-medium">
        {/* Understood Request */}
        <div className="space-y-xsmall">
          <h4 className="text-label font-semibold text-foreground">
            Requisição Entendida
          </h4>
          <div className="bg-grayscale-5 p-default rounded-big space-y-xsmall text-small">
            <p><span className="text-muted-foreground">Cargo:</span> {insights.understood_request.role || "N/A"}</p>
            <p><span className="text-muted-foreground">Senioridade:</span> {insights.understood_request.seniority || "N/A"}</p>
            {insights.understood_request.must_have.length > 0 && (
              <p><span className="text-muted-foreground">Must-have:</span> {insights.understood_request.must_have.join(", ")}</p>
            )}
            {insights.understood_request.nice_to_have.length > 0 && (
              <p><span className="text-muted-foreground">Nice-to-have:</span> {insights.understood_request.nice_to_have.join(", ")}</p>
            )}
            {insights.understood_request.context && (
              <p><span className="text-muted-foreground">Contexto:</span> {insights.understood_request.context}</p>
            )}
          </div>
        </div>

        {/* Risks and Gaps */}
        {insights.risks_and_gaps_overall.length > 0 && (
          <div className="space-y-xsmall">
            <h4 className="text-label font-semibold flex items-center gap-xsmall text-warning">
              <FontAwesomeIcon icon={faTriangleExclamation} />
              Riscos e Gaps Gerais
            </h4>
            <ul className="text-small text-muted-foreground space-y-xsmall">
              {insights.risks_and_gaps_overall.map((risk, idx) => (
                <li key={idx}>• {risk}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Assumptions Made */}
        {insights.assumptions_made.length > 0 && (
          <div className="space-y-xsmall">
            <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
              <FontAwesomeIcon icon={faLightbulb} className="text-primary" />
              Suposições Feitas
            </h4>
            <ul className="text-small text-muted-foreground space-y-xsmall">
              {insights.assumptions_made.map((assumption, idx) => (
                <li key={idx}>• {assumption}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps - Interview Checks */}
        {insights.next_steps.suggested_interview_checks.length > 0 && (
          <div className="space-y-xsmall">
            <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
              <FontAwesomeIcon icon={faClipboardCheck} className="text-success" />
              Checklist para Entrevista
            </h4>
            <ul className="text-small text-muted-foreground space-y-xsmall">
              {insights.next_steps.suggested_interview_checks.map((check, idx) => (
                <li key={idx}>☐ {check}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Next Steps - Filters */}
        {insights.next_steps.suggested_filters_to_refine.length > 0 && (
          <div className="space-y-xsmall">
            <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
              <FontAwesomeIcon icon={faFilter} className="text-primary" />
              Filtros Sugeridos para Refinar
            </h4>
            <ul className="text-small text-muted-foreground space-y-xsmall">
              {insights.next_steps.suggested_filters_to_refine.map((filter, idx) => (
                <li key={idx}>• {filter}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Clarifying Questions */}
        {insights.clarifying_questions.length > 0 && (
          <div className="space-y-xsmall">
            <h4 className="text-label font-semibold flex items-center gap-xsmall text-foreground">
              Perguntas de Esclarecimento
            </h4>
            <ul className="text-small text-muted-foreground space-y-xsmall">
              {insights.clarifying_questions.map((question, idx) => (
                <li key={idx}>• {question}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
