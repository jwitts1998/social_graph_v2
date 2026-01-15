import { ChevronDown, ChevronUp, Info } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

interface ScoreBreakdown {
  embedding?: number;
  semantic: number;
  tagOverlap: number;
  roleMatch: number;
  geoMatch: number;
  relationship: number;
  nameMatch?: number;
}

interface ConfidenceScores {
  semantic: number;
  tagOverlap: number;
  roleMatch: number;
  geoMatch: number;
  relationship: number;
  overall: number;
}

interface MatchScoreBreakdownProps {
  scoreBreakdown: ScoreBreakdown;
  confidenceScores: ConfidenceScores;
  rawScore: number;
  starScore: number;
  matchVersion?: string;
}

const COMPONENT_INFO: Record<string, { name: string; description: string; weight: number }> = {
  embedding: {
    name: "Semantic Similarity (AI)",
    description: "Deep semantic understanding using AI embeddings - measures true meaning alignment between conversation and contact profile",
    weight: 0.30,
  },
  semantic: {
    name: "Keyword Match",
    description: "How well keywords from the conversation match the contact's profile (bio, title, notes)",
    weight: 0.10,
  },
  tagOverlap: {
    name: "Tag Overlap",
    description: "Similarity between conversation topics and contact's investment thesis (sectors, stages, geos)",
    weight: 0.30,
  },
  roleMatch: {
    name: "Role Match",
    description: "Whether the contact's role/type matches what's needed (investor type, hiring role, etc.)",
    weight: 0.10,
  },
  geoMatch: {
    name: "Geographic Match",
    description: "Location alignment between conversation context and contact location",
    weight: 0.10,
  },
  relationship: {
    name: "Relationship Strength",
    description: "Your existing relationship strength with this contact (0-100 scale)",
    weight: 0.10,
  },
  nameMatch: {
    name: "Name Mentioned",
    description: "Contact's name was explicitly mentioned in the conversation (bonus boost)",
    weight: 0.30,
  },
};

function getConfidenceColor(confidence: number): string {
  if (confidence >= 0.8) return "text-green-600 dark:text-green-400";
  if (confidence >= 0.5) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.8) return "High";
  if (confidence >= 0.5) return "Medium";
  return "Low";
}

function getProgressColor(value: number): string {
  if (value >= 0.7) return "bg-green-500";
  if (value >= 0.4) return "bg-yellow-500";
  return "bg-blue-500";
}

export default function MatchScoreBreakdown({
  scoreBreakdown,
  confidenceScores,
  rawScore,
  starScore,
  matchVersion = "v1.0",
}: MatchScoreBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const components: (keyof ScoreBreakdown)[] = [];
  
  // Add embedding first if available (most important)
  if (scoreBreakdown.embedding !== undefined && scoreBreakdown.embedding >= 0) {
    components.push("embedding");
  }
  
  // Add other components
  components.push("semantic", "tagOverlap", "roleMatch", "geoMatch", "relationship");

  // Add name match if present
  if (scoreBreakdown.nameMatch && scoreBreakdown.nameMatch > 0) {
    components.push("nameMatch");
  }

  const overallConfidence = confidenceScores.overall || 0.5;

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Header - Always Visible */}
      <Button
        variant="ghost"
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">Score Breakdown</span>
          <Badge variant="secondary" className="text-xs">
            {matchVersion}
          </Badge>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-sm font-semibold">
              {(rawScore * 100).toFixed(0)}%
            </div>
            <div className={`text-xs ${getConfidenceColor(overallConfidence)}`}>
              {getConfidenceLabel(overallConfidence)} confidence
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </Button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-4 bg-muted/30">
          <div className="text-xs text-muted-foreground border-t border-border pt-4">
            Each component contributes to the overall match score. Higher scores indicate better alignment.
          </div>

          {components.map((component) => {
            const score = scoreBreakdown[component] || 0;
            const confidence = confidenceScores[component as keyof ConfidenceScores] || 0.5;
            const info = COMPONENT_INFO[component];
            const weightedContribution = score * info.weight;

            return (
              <div key={component} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{info.name}</span>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="h-3.5 w-3.5 text-muted-foreground" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs">
                          <p className="text-xs">{info.description}</p>
                          <p className="text-xs mt-1 text-muted-foreground">
                            Weight: {(info.weight * 100).toFixed(0)}%
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-xs text-muted-foreground">
                      {(score * 100).toFixed(0)}% × {(info.weight * 100).toFixed(0)}% = {(weightedContribution * 100).toFixed(1)}%
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-xs ${getConfidenceColor(confidence)}`}
                    >
                      {getConfidenceLabel(confidence)}
                    </Badge>
                  </div>
                </div>
                <div className="relative">
                  <Progress
                    value={score * 100}
                    className="h-2"
                  />
                  <div
                    className={`absolute top-0 left-0 h-2 rounded-full ${getProgressColor(score)}`}
                    style={{ width: `${score * 100}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Summary */}
          <div className="border-t border-border pt-4 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold">Overall Match Score</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">
                  {"⭐".repeat(starScore)}
                </span>
                <span className="text-sm text-muted-foreground">
                  ({(rawScore * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              Overall confidence: <span className={getConfidenceColor(overallConfidence)}>
                {getConfidenceLabel(overallConfidence)} ({(overallConfidence * 100).toFixed(0)}%)
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
