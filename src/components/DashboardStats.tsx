import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Loader2 } from "lucide-react";

interface ProjectStats {
  total: number;
  byStatus: { status: string; count: number }[];
  byModel: { model: string; count: number }[];
  recentActivity: { date: string; count: number }[];
}

const STATUS_COLORS: Record<string, string> = {
  draft: "hsl(var(--chart-1))",
  processing: "hsl(var(--chart-2))",
  completed: "hsl(var(--chart-3))",
  failed: "hsl(var(--chart-4))",
};

export const DashboardStats = ({ userId }: { userId: string }) => {
  const [stats, setStats] = useState<ProjectStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, [userId]);

  const fetchStats = async () => {
    try {
      const { data: projects, error } = await supabase
        .from("projects")
        .select("status, ai_model, created_at")
        .eq("user_id", userId);

      if (error) throw error;

      // Calculate statistics
      const total = projects?.length || 0;

      // Group by status
      const statusMap = new Map<string, number>();
      projects?.forEach((p) => {
        statusMap.set(p.status, (statusMap.get(p.status) || 0) + 1);
      });
      const byStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
      }));

      // Group by AI model
      const modelMap = new Map<string, number>();
      projects?.forEach((p) => {
        modelMap.set(p.ai_model, (modelMap.get(p.ai_model) || 0) + 1);
      });
      const byModel = Array.from(modelMap.entries()).map(([model, count]) => ({
        model,
        count,
      }));

      // Recent activity (last 7 days)
      const now = new Date();
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date(now);
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split("T")[0];
      });

      const activityMap = new Map<string, number>();
      projects?.forEach((p) => {
        const date = new Date(p.created_at).toISOString().split("T")[0];
        if (last7Days.includes(date)) {
          activityMap.set(date, (activityMap.get(date) || 0) + 1);
        }
      });

      const recentActivity = last7Days.map((date) => ({
        date: new Date(date).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
        count: activityMap.get(date) || 0,
      }));

      setStats({ total, byStatus, byModel, recentActivity });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">총 프로젝트</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        {stats.byStatus.map((item) => (
          <Card key={item.status}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium capitalize">{item.status}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{item.count}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>상태별 프로젝트</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.byStatus}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                >
                  {stats.byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "hsl(var(--primary))"} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AI 모델별 사용 현황</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.byModel}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="model" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>최근 7일 활동</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={stats.recentActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
};
