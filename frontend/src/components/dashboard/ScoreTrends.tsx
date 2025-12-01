import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { supabase } from "@/utils/supabase/client";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function ScoreTrends() {
  const [trendData, setTrendData] = useState<{ month: string; avgScore: number; applications: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTrends() {
      setLoading(true);
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(currentYear, 0, 1);

      // Fetch all scores for the current year from ml_application_scores
      const { data: scoresData, error } = await supabase
        .from("ml_application_scores")
        .select("application_id, credit_score, scored_at")
        .gte("scored_at", startOfYear.toISOString());

      if (error || !scoresData) {
        setTrendData([]);
        setLoading(false);
        if (error) console.error("Supabase error:", error);
        return;
      }

      // For each application_id, keep only the latest score (latest scored_at)
      const latestScoreMap = new Map<string, { credit_score: number | null; scored_at: string }>();
      (scoresData || []).forEach(row => {
        if (!row.application_id || row.credit_score == null) return;
        const prev = latestScoreMap.get(row.application_id);
        if (!prev || new Date(row.scored_at) > new Date(prev.scored_at)) {
          latestScoreMap.set(row.application_id, { credit_score: row.credit_score, scored_at: row.scored_at });
        }
      });

      // Aggregate scores by month
      const monthly: Record<number, number[]> = {};
      latestScoreMap.forEach(({ credit_score, scored_at }) => {
        const mIdx = new Date(scored_at).getMonth();
        if (!monthly[mIdx]) monthly[mIdx] = [];
        monthly[mIdx].push(credit_score || 0);
      });

      // Prepare Recharts data: only months with data
      const chartRows = MONTHS.map((month, idx) => {
        const scores = monthly[idx] ?? [];
        return {
          month,
          avgScore: scores.length ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100 : 0,
          applications: scores.length,
        };
      }).filter((row) => row.applications > 0);

      setTrendData(chartRows);
      setLoading(false);
    }
    fetchTrends();
  }, []);

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle>Credit Score Trends</CardTitle>
        <p className="text-sm text-muted-foreground">
          Average credit scores and application volume over time
        </p>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
              />
              <Line
                type="monotone"
                dataKey="avgScore"
                stroke="hsl(var(--primary))"
                strokeWidth={3}
                name="Average Score"
                dot={{ fill: "hsl(var(--primary))", strokeWidth: 2, r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="applications"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                name="Applications"
                dot={{ fill: "hsl(var(--success))", strokeWidth: 2, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        {loading && (
          <div className="text-center mt-4 text-muted-foreground text-xs">
            Loading...
          </div>
        )}
        <div className="flex items-center justify-center gap-6 mt-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-primary rounded-full" />
            <span>Average Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-success rounded-full" />
            <span>Applications</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
