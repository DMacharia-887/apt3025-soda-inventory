import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { supabase } from "@/utils/supabase/client";

const RISK_BUCKETS = [
  { name: "Low Risk (80-100)", min: 80, max: 100, color: "hsl(var(--success))" },
  { name: "Moderate Risk (60-79)", min: 60, max: 79, color: "hsl(var(--warning))" },
  { name: "High Risk (40-59)", min: 40, max: 59, color: "hsl(var(--destructive))" },
  { name: "Very High Risk (<40)", min: -Infinity, max: 39, color: "#8b5cf6" }
];

type RiskPieData = { name: string; value: number; color: string };

export function RiskDistribution() {
  const [riskData, setRiskData] = useState<RiskPieData[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchRiskBuckets() {
      setLoading(true);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // Fetch the *latest* score for each application in the past 30 days
      const { data: scoresRaw, error } = await supabase
        .from("ml_application_scores")
        .select("application_id, credit_score, scored_at")
        .gte("scored_at", thirtyDaysAgo.toISOString());

      if (error) {
        setRiskData(null);
        setLoading(false);
        return;
      }

      // For each application_id, keep only the latest score
      const latestScoreMap = new Map<string, number>();
      (scoresRaw || []).forEach(row => {
        if (!row.credit_score || !row.application_id) return;
        const prev = latestScoreMap.get(row.application_id);
        const prevRow = (scoresRaw || []).find(
          r => r.application_id === row.application_id && r.credit_score === prev
        );
        if (
          !prev ||
          (prevRow && new Date(row.scored_at) > new Date(prevRow.scored_at))
        ) {
          latestScoreMap.set(row.application_id, row.credit_score);
        }
      });

      // Aggregate by risk bucket
      const counts = RISK_BUCKETS.map(() => 0);
      latestScoreMap.forEach(score => {
        if (score == null) return;
        const bucketIndex = RISK_BUCKETS.findIndex(
          bucket => score >= bucket.min && score <= bucket.max
        );
        if (bucketIndex !== -1) counts[bucketIndex]++;
      });
      const total = counts.reduce((a, b) => a + b, 0);
      const pieData = RISK_BUCKETS.map((bucket, idx) => ({
        name: bucket.name,
        value: total ? Math.round((counts[idx] / total) * 100) : 0,
        color: bucket.color
      }));
      setRiskData(pieData);
      setLoading(false);
    }
    fetchRiskBuckets();
  }, []);

  return (
    <Card className="col-span-1">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Risk Distribution
          <span className="text-sm font-normal text-muted-foreground">
            (Last 30 days)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={riskData ?? RISK_BUCKETS.map(b => ({ ...b, value: 0 }))}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={2}
                dataKey="value"
              >
                {(riskData ?? RISK_BUCKETS.map(b => ({ ...b, value: 0 }))).map(
                  (entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  )
                )}
              </Pie>
              <Tooltip
                formatter={value => [`${value}%`, "Percentage"]}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: "12px" }}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {(riskData ?? RISK_BUCKETS.map(b => ({ ...b, value: 0 }))).map(
            (item, index) => (
              <div key={index} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <div className="text-sm">
                  <div className="font-medium">{item.value}%</div>
                  <div className="text-muted-foreground text-xs">{item.name}</div>
                </div>
              </div>
            )
          )}
        </div>
        {loading && (
          <div className="mt-4 text-center text-xs text-muted-foreground">
            Loading data...
          </div>
        )}
      </CardContent>
    </Card>
  );
}
