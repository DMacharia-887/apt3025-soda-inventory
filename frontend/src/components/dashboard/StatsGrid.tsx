import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import {
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CheckCircle,
  AlertTriangle
} from "lucide-react";
import { supabase } from "@/utils/supabase/client";

interface StatCardProps {
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  icon: React.ComponentType<{ className?: string }>;
  variant?: "default" | "success" | "warning" | "destructive";
}

function StatCard({ title, value, change, trend, icon: Icon, variant = "default" }: StatCardProps) {
  const colorClasses = {
    default: "text-primary",
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive"
  };

  const bgClasses = {
    default: "bg-primary/10",
    success: "bg-success/10",
    warning: "bg-warning/10",
    destructive: "bg-destructive/10"
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${bgClasses[variant]}`}>
          <Icon className={`h-4 w-4 ${colorClasses[variant]}`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="flex items-center text-xs text-muted-foreground mt-1">
          {trend === "up" ? (
            <TrendingUp className="h-3 w-3 text-success mr-1" />
          ) : (
            <TrendingDown className="h-3 w-3 text-destructive mr-1" />
          )}
          <span className={trend === "up" ? "text-success" : "text-destructive"}>
            {change}
          </span>
          <span className="ml-1">from last month</span>
        </div>
      </CardContent>
    </Card>
  );
}

function formatMoneyKES(amount: number) {
  if (!amount) return "KSh 0";
  if (amount >= 1_000_000_000) return `KSh ${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `KSh ${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `KSh ${(amount / 1_000).toFixed(1)}K`;
  return `KSh ${amount.toLocaleString()}`;
}

export function StatsGrid() {
  const [stats, setStats] = useState({
    total: 0,
    approvedToday: 0,
    pending: 0,
    avgScore: 0,
    avgScorePrevMonth: 0,
    loanVolume: 0,
    loanVolumePrevMonth: 0,
    approvalsThisMonth: 0,
    totalThisMonth: 0,
    approvalsPrevMonth: 0,
    totalPrevMonth: 0,
    loading: true,
    error: ""
  });

  useEffect(() => {
    async function fetchStats() {
      setStats(s => ({ ...s, loading: true, error: "" }));
      try {
        const today = new Date();
        const dayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        const prevMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const prevMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);

        // ---- Application volume and pending
        const [{ count: totalApplications }, { data: loanAll }] = await Promise.all([
          supabase.from("credit_applications").select("id", { count: "exact", head: true }),
          supabase.from("credit_applications").select("loan_amount")
        ]);
        const loanVolume = (loanAll ?? []).reduce(
          (sum, row: any) => sum + (row.loan_amount ? Number(row.loan_amount) : 0), 0
        );

        // ---- Approved today count
        const { count: approvedToday } = await supabase
          .from("credit_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .gte("created_at", dayStart.toISOString());

        // ---- Pending review count
        const { count: pending } = await supabase
          .from("credit_applications")
          .select("id", { count: "exact", head: true })
          .eq("status", "pending");

        // ---- This month scores, volumes, approvals from ML score table
        // Get all scored applications for this month
        const { data: scoresMonth } = await supabase
          .from("ml_application_scores")
          .select("credit_score, scored_at, application_id");

        // Only scores in this month
        const scoredThisMonth = (scoresMonth ?? []).filter(row => {
          return row.scored_at
            && new Date(row.scored_at) >= thisMonthStart
            && new Date(row.scored_at) <= today;
        });

        // For applications, we need their statuses and volume for this month
        const { data: appsThisMonth } = await supabase
          .from("credit_applications")
          .select("id, status, loan_amount, created_at")
          .gte("created_at", thisMonthStart.toISOString());

        // Get scores for matched application IDs in this month
        // (If apps and scores can be joined, you can optimize further!)
        const scoreVals = scoredThisMonth.map(r => r.credit_score).filter(n => typeof n === "number");
        const avgScore = scoreVals.length
          ? Math.round((scoreVals.reduce((a, b) => a + b, 0) / scoreVals.length) * 100) / 100
          : 0;

        const approvalsThisMonth = (appsThisMonth ?? []).filter(r => r.status === "approved").length;
        const totalThisMonth = appsThisMonth?.length ?? 0;
        const loanVolumeMonth = (appsThisMonth ?? []).reduce(
          (sum, r: any) => sum + (r.status === "approved" ? Number(r.loan_amount) : 0), 0
        );

        // ---- Previous month scores and approvals
        const { data: scoresPrevMonth } = await supabase
          .from("ml_application_scores")
          .select("credit_score, scored_at, application_id");

        // Only scores in prev month
        const scoredPrevMonth = (scoresPrevMonth ?? []).filter(row => {
          return row.scored_at
            && new Date(row.scored_at) >= prevMonthStart
            && new Date(row.scored_at) < thisMonthStart;
        });

        // Applications in previous month for status and volume
        const { data: appsPrevMonth } = await supabase
          .from("credit_applications")
          .select("id, status, loan_amount, created_at")
          .gte("created_at", prevMonthStart.toISOString())
          .lt("created_at", thisMonthStart.toISOString());

        const scoreValsPrev = scoredPrevMonth.map(r => r.credit_score).filter(n => typeof n === "number");
        const avgScorePrevMonth = scoreValsPrev.length
          ? Math.round((scoreValsPrev.reduce((a, b) => a + b, 0) / scoreValsPrev.length) * 100) / 100
          : 0;

        const approvalsPrevMonth = (appsPrevMonth ?? []).filter(r => r.status === "approved").length;
        const totalPrevMonth = appsPrevMonth?.length ?? 0;
        const loanVolumePrevMonth = (appsPrevMonth ?? []).reduce(
          (sum, r: any) => sum + (r.status === "approved" ? Number(r.loan_amount) : 0), 0
        );

        setStats({
          total: totalApplications || 0,
          approvedToday: approvedToday || 0,
          pending: pending || 0,
          avgScore,
          avgScorePrevMonth,
          loanVolume,
          loanVolumePrevMonth,
          approvalsThisMonth,
          totalThisMonth,
          approvalsPrevMonth,
          totalPrevMonth,
          loading: false,
          error: ""
        });
      } catch (err: any) {
        setStats(prev => ({ ...prev, loading: false, error: "Failed to load stats" }));
      }
    }
    fetchStats();
  }, []);

  if (stats.loading) {
    return <div className="py-10 text-muted-foreground text-center">Loading stats...</div>;
  }
  if (stats.error) {
    return <div className="py-10 text-destructive text-center">{stats.error}</div>;
  }

  function percentChange(curr: number, prev: number) {
    if (!prev) return curr ? "+100%" : "0%";
    const diff = curr - prev;
    const base = Math.abs(prev);
    const pct = Math.round((diff / (base || 1)) * 100);
    if (pct === 0) return "0%";
    if (pct > 0) return `+${pct}%`;
    return `${pct}%`;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard
        title="Total Applications"
        value={stats.total.toLocaleString()}
        change={percentChange(stats.totalThisMonth, stats.totalPrevMonth)}
        trend={stats.totalThisMonth > stats.totalPrevMonth ? "up" : "down"}
        icon={Users}
      />
      <StatCard
        title="Approved Today"
        value={stats.approvedToday.toLocaleString()}
        change={percentChange(stats.approvalsThisMonth, stats.approvalsPrevMonth)}
        trend={stats.approvalsThisMonth > stats.approvalsPrevMonth ? "up" : "down"}
        icon={CheckCircle}
        variant="success"
      />
      <StatCard
        title="Pending Review"
        value={stats.pending.toLocaleString()}
        change="0%"
        trend="up"
        icon={AlertTriangle}
        variant="warning"
      />
      <StatCard
        title="Average Score"
        value={stats.avgScore ? stats.avgScore.toString() : "—"}
        change={percentChange(stats.avgScore, stats.avgScorePrevMonth)}
        trend={stats.avgScore > stats.avgScorePrevMonth ? "up" : "down"}
        icon={TrendingUp}
      />
      <StatCard
        title="Loan Volume"
        value={formatMoneyKES(stats.loanVolume)}
        change={percentChange(stats.loanVolume, stats.loanVolumePrevMonth)}
        trend={stats.loanVolume > stats.loanVolumePrevMonth ? "up" : "down"}
        icon={DollarSign}
        variant="success"
      />
      <StatCard
        title="Success Rate"
        value={
          stats.totalThisMonth
            ? `${Math.round((stats.approvalsThisMonth / stats.totalThisMonth) * 100)}%`
            : "—"
        }
        change={percentChange(
          stats.totalPrevMonth
            ? Math.round((stats.approvalsThisMonth / (stats.totalThisMonth || 1)) * 100)
            : 0,
          stats.totalPrevMonth
            ? Math.round((stats.approvalsPrevMonth / (stats.totalPrevMonth || 1)) * 100)
            : 0
        )}
        trend={
          (stats.approvalsThisMonth / (stats.totalThisMonth || 1)) >
          (stats.approvalsPrevMonth / (stats.totalPrevMonth || 1))
            ? "up"
            : "down"
        }
        icon={CheckCircle}
        variant={
          (stats.approvalsThisMonth / (stats.totalThisMonth || 1)) <
          (stats.approvalsPrevMonth / (stats.totalPrevMonth || 1))
            ? "destructive"
            : "success"
        }
      />
    </div>
  );
}
