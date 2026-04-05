import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Loader2, Sparkles, RefreshCw, Clock, Zap } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import * as aiService from "../../lib/services/aiSummary.service";
import type {
  AiQuestion,
  AiAnswerResponse,
} from "../../lib/services/aiSummary.service";

export function AiAssistantPage() {
  const [questions, setQuestions] = useState<AiQuestion[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [answer, setAnswer] = useState<AiAnswerResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQ, setLoadingQ] = useState(true);

  useEffect(() => {
    aiService
      .getQuestions()
      .then(setQuestions)
      .catch(() => toast.error("Không thể tải danh sách câu hỏi"))
      .finally(() => setLoadingQ(false));
  }, []);

  const handleAsk = async (questionType: string, forceRefresh = false) => {
    setSelected(questionType);
    setAnswer(null);
    setLoading(true);
    try {
      // Nếu force refresh → có thể thêm param sau, hiện tại invalidate bằng data thay đổi
      const res = await aiService.ask(questionType);
      setAnswer(res);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "AI không phản hồi được";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const taskQuestions = questions.filter((q) => q.category === "task");
  const salaryQuestions = questions.filter((q) => q.category === "salary");

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex items-start gap-4">
        <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-xl">
          <Sparkles className="h-7 w-7 text-purple-600 dark:text-purple-400" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">AI Assistant</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Hỏi AI về công việc và lương của bạn — câu trả lời dựa trên dữ liệu
            thực tế
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar: Question list */}
        <div className="space-y-4">
          {/* Task questions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                📋 Công Việc
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {loadingQ ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              ) : (
                taskQuestions.map((q) => (
                  <button
                    key={q.type}
                    onClick={() => handleAsk(q.type)}
                    disabled={loading}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      selected === q.type
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-muted"
                    }`}
                  >
                    <span className="mr-2">{q.emoji}</span>
                    {q.label}
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          {/* Salary questions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                💰 Lương & Thu Nhập
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 pt-0">
              {salaryQuestions.map((q) => (
                <button
                  key={q.type}
                  onClick={() => handleAsk(q.type)}
                  disabled={loading}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    selected === q.type
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-muted"
                  }`}
                >
                  <span className="mr-2">{q.emoji}</span>
                  {q.label}
                </button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Main: Answer area */}
        <Card className="min-h-[400px]">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">
                {selected
                  ? (questions.find((q) => q.type === selected)?.label ??
                    "Kết quả")
                  : "Chọn câu hỏi"}
              </CardTitle>
              {answer && (
                <div className="flex items-center gap-2">
                  {answer.fromCache ? (
                    <Badge variant="secondary" className="gap-1 text-xs">
                      <Clock className="h-3 w-3" /> Từ cache
                    </Badge>
                  ) : (
                    <Badge className="gap-1 text-xs bg-purple-600">
                      <Zap className="h-3 w-3" /> AI mới
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => selected && handleAsk(selected)}
                    disabled={loading}
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </div>
              )}
            </div>
            {answer?.cachedAt && (
              <CardDescription className="text-xs">
                Cập nhật lúc:{" "}
                {format(new Date(answer.cachedAt), "HH:mm dd/MM/yyyy", {
                  locale: vi,
                })}
                {answer.expiresAt && (
                  <span className="ml-2">
                    — Hết hạn:{" "}
                    {format(new Date(answer.expiresAt), "HH:mm", {
                      locale: vi,
                    })}
                  </span>
                )}
              </CardDescription>
            )}
          </CardHeader>

          <Separator />

          <CardContent className="pt-6">
            {!selected && !loading && (
              <div className="flex flex-col items-center justify-center h-56 text-center text-muted-foreground">
                <Sparkles className="h-12 w-12 mb-4 opacity-30" />
                <p className="text-sm font-medium">Chọn một câu hỏi bên trái</p>
                <p className="text-xs mt-1 opacity-70">
                  AI sẽ phân tích dữ liệu thực tế của bạn
                </p>
              </div>
            )}

            {loading && (
              <div className="flex flex-col items-center justify-center h-56 gap-3">
                <div className="relative">
                  <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                </div>
                <p className="text-sm text-muted-foreground animate-pulse">
                  AI đang phân tích dữ liệu...
                </p>
              </div>
            )}

            {!loading && answer && (
              <div className="prose prose-sm dark:prose-invert max-w-none">
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {answer.answer}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
