import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Eye, MoreHorizontal } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { supabase } from "@/utils/supabase/client";

// Risk helpers (unchanged)
function getRiskLevel(score: number | null) {
  if (score == null) return "unknown";
  if (score >= 80) return "low";
  if (score >= 60) return "moderate";
  if (score >= 40) return "high";
  return "very-high";
}
function getRiskBadge(riskLevel: string, score: number | null) {
  const variants = {
    low: "bg-success text-success-foreground",
    moderate: "bg-warning text-warning-foreground",
    high: "bg-destructive text-destructive-foreground",
    "very-high": "bg-purple-600 text-white",
    unknown: "bg-muted text-muted-foreground border"
  };
  const labels = {
    low: "Low Risk",
    moderate: "Moderate Risk",
    high: "High Risk",
    "very-high": "Very High Risk",
    unknown: "Not Scored"
  };
  return (
    <Badge variant="secondary" className={variants[riskLevel] || ""}>
      {labels[riskLevel] || "—"}
      {score != null ? ` (${score})` : ""}
    </Badge>
  );
}
function getStatusBadge(status: string) {
  const variants = {
    pending: "bg-warning/20 text-warning border-warning/30",
    approved: "bg-success/20 text-success border-success/30",
    rejected: "bg-destructive/20 text-destructive border-destructive/30"
  };
  return (
    <Badge variant="outline" className={variants[status] || ""}>
      {status?.charAt(0).toUpperCase() + status?.slice(1)}
    </Badge>
  );
}

type Borrower = { first_name?: string; last_name?: string };

export function RecentApplications() {
  const [apps, setApps] = useState<
    Array<{
      id: string;
      loan_amount: number | null;
      status: string | null;
      created_at: string;
      borrowers: Borrower | null;
      credit_score: number | null;
      risk_level: string | null;
    }>
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchApps() {
      setLoading(true);
      // 1. Fetch the 5 latest apps
      const { data: appRows, error } = await supabase
        .from("credit_applications")
        .select(
          `
            id,
            loan_amount,
            status,
            created_at,
            borrowers (
              first_name,
              last_name
            )
          `
        )
        .order("created_at", { ascending: false })
        .limit(5);
      if (!appRows || error) {
        setApps([]);
        setLoading(false);
        return;
      }

      // 2. Fetch the latest score per app (from ml_application_scores)
      const appIds: string[] = appRows
        .map(a => a.id)
        .filter((id): id is string => typeof id === "string" && Boolean(id));

      let scoreMap = new Map<
        string,
        { credit_score: number | null; risk_level: string | null; scored_at: string }
      >();

      if (appIds.length > 0) {
        const { data: scores } = await supabase
          .from("ml_application_scores")
          .select("application_id, credit_score, risk_level, scored_at")
          .in("application_id", appIds);

        (scores || []).forEach(score => {
          const id = score.application_id;
          if (!id) return;
          const current = scoreMap.get(id);
          if (!current || new Date(score.scored_at) > new Date(current.scored_at)) {
            scoreMap.set(id, score);
          }
        });
      }

      // 3. Combine app rows and scores for rendering
      setApps(
        appRows.map(app => {
          const score = app.id ? scoreMap.get(app.id) : undefined;
          return {
            ...app,
            credit_score: score?.credit_score ?? null,
            risk_level: score?.risk_level ?? null
          };
        })
      );
      setLoading(false);
    }
    fetchApps();
  }, []);

  return (
    <Card className="col-span-3">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Recent Applications</CardTitle>
          <p className="text-sm text-muted-foreground">
            Latest credit scoring requests requiring review
          </p>
        </div>
        <Button variant="outline" size="sm">
          View All
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="py-12 text-center text-muted-foreground">Loading...</div>
        ) : apps.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">No recent applications.</div>
        ) : (
          <div className="space-y-4">
            {apps.map((app) => {
              const riskLevel = getRiskLevel(app.credit_score);
              const submittedAt = app.created_at
                ? formatDistanceToNow(parseISO(app.created_at), { addSuffix: true })
                : "";
              const name =
                app.borrowers && (app.borrowers.first_name || app.borrowers.last_name)
                  ? `${app.borrowers.first_name || ""} ${app.borrowers.last_name || ""}`.trim()
                  : "Unknown";
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                        {name
                          ?.split(" ")
                          .filter((str) => str)
                          .map((n) => n[0])
                          .join("") || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{name || "Unknown"}</p>
                        <span className="text-xs text-muted-foreground">#{app.id}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getRiskBadge(riskLevel, app.credit_score)}
                        {getStatusBadge(app.status || "")}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-lg">
                      {typeof app.loan_amount === "number"
                        ? `KSh ${app.loan_amount.toLocaleString()}`
                        : "—"}
                    </p>
                    <p className="text-xs text-muted-foreground">{submittedAt}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="p-2">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="p-2">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
