import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Star, CheckCircle2, ArrowLeft, MessageSquare } from "lucide-react";

const CourseFeedbackPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [projectTitle, setProjectTitle] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    rating: 0,
    comment: "",
  });

  useEffect(() => {
    if (id) {
      fetchProjectTitle();
    }
  }, [id]);

  const fetchProjectTitle = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("title")
        .eq("id", id)
        .single();

      if (error) throw error;
      setProjectTitle(data?.title || "");
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (formData.rating === 0) {
      toast.error("평점을 선택해주세요.");
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase
        .from("course_feedbacks")
        .insert({
          project_id: id,
          user_email: formData.email || null,
          rating: formData.rating,
          comment: formData.comment || null,
          feedback_type: "general",
        });

      if (error) throw error;

      setSubmitted(true);
      toast.success("피드백이 제출되었습니다. 감사합니다!");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      toast.error("피드백 제출 중 오류가 발생했습니다.");
    } finally {
      setSubmitting(false);
    }
  };

  const StarRating = ({ rating, onSelect }: { rating: number; onSelect: (rating: number) => void }) => {
    const [hovered, setHovered] = useState(0);

    return (
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onSelect(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="cursor-pointer hover:scale-110 transition-transform"
          >
            <Star
              className={`h-8 w-8 ${
                star <= (hovered || rating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="text-center py-12">
            <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">감사합니다!</h2>
            <p className="text-muted-foreground mb-6">
              소중한 피드백이 제출되었습니다.
            </p>
            <Button onClick={() => navigate(`/course/${id}`)}>
              교육 과정 보기
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mx-auto mb-4">
            <MessageSquare className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-xl">피드백 남기기</CardTitle>
          <CardDescription>
            {projectTitle && <span className="font-medium">"{projectTitle}"</span>}
            <br />
            교육 과정에 대한 의견을 남겨주세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>평점 *</Label>
            <div className="flex justify-center">
              <StarRating
                rating={formData.rating}
                onSelect={(r) => setFormData({ ...formData, rating: r })}
              />
            </div>
            {formData.rating > 0 && (
              <p className="text-center text-sm text-muted-foreground">
                {formData.rating === 5 && "최고예요!"}
                {formData.rating === 4 && "좋아요!"}
                {formData.rating === 3 && "괜찮아요"}
                {formData.rating === 2 && "아쉬워요"}
                {formData.rating === 1 && "개선이 필요해요"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">이메일 (선택)</Label>
            <Input
              id="email"
              type="email"
              placeholder="email@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              이메일을 남기시면 개선 사항에 대해 연락드릴 수 있습니다
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">의견</Label>
            <Textarea
              id="comment"
              placeholder="교육 과정에서 좋았던 점, 개선되었으면 하는 점을 자유롭게 남겨주세요..."
              value={formData.comment}
              onChange={(e) => setFormData({ ...formData, comment: e.target.value })}
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitting || formData.rating === 0}
            className="w-full"
            size="lg"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                제출 중...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                피드백 제출
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => navigate(`/course/${id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            교육 과정으로 돌아가기
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default CourseFeedbackPage;
