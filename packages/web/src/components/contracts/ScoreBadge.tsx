import { Badge } from "@/components/ui";
import type { ScoreCategory } from "@/lib/types";

interface ScoreBadgeProps {
  score: number;
  category: ScoreCategory;
}

const categoryVariant: Record<ScoreCategory, "success" | "warning" | "danger"> =
  {
    LOW: "success",
    MEDIUM: "warning",
    HIGH: "danger",
  };

export function ScoreBadge({ score, category }: ScoreBadgeProps) {
  return (
    <Badge variant={categoryVariant[category]} className="tabular-nums">
      {score}
    </Badge>
  );
}
