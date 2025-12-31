/**
 * DashboardStats 컴포넌트
 * 
 * 수정일: 2025-12-31
 * 수정 내용: Azure 인증 전환으로 Supabase 연결 불가, 에러 조용히 처리
 * 
 * TODO: Azure Functions API로 통계 데이터 가져오기
 */

import { useCallback, useEffect, useState } from "react";
// import { supabase } from "@/integrations/supabase/client";
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

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      
      const { callAzureFunctionDirect } = await import('@/lib/azureFunctions');
      const { data, error } = await callAzureFunctionDirect<{ success: boolean; stats: any }>(
        `/api/getStats/${userId}`,
        'GET'
      );
      
      if (error) throw error;
      if (data?.success && data.stats) {
        // Convert recentActivity to the expected format
        const recentActivity = data.stats.recentActivity?.map((activity: any) => ({
          date: new Date(activity.createdAt).toLocaleDateString("ko-KR", { month: "short", day: "numeric" }),
          count: 1,
        })) || [];
        
        setStats({
          total: data.stats.total || 0,
          byStatus: data.stats.byStatus || [],
          byModel: data.stats.byModel || [],
          recentActivity,
        });
      } else {
        setStats({
          total: 0,
          byStatus: [],
          byModel: [],
          recentActivity: [],
        });
      }
    } catch (error) {
      console.error('[DashboardStats] Failed to fetch stats:', error);
      setStats({
        total: 0,
        byStatus: [],
        byModel: [],
        recentActivity: [],
      });
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

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
