"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function GenerateAnalysisButton({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function generateAnalysis() {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await fetch(`/api/projects/${projectId}/analysis`, {
        method: "POST",
      });
      const body = (await response.json()) as { error?: { message?: string } };
      if (!response.ok) {
        throw new Error(body.error?.message ?? "岗位分析生成失败，请重试。");
      }
      router.refresh();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "岗位分析生成失败，请重试。");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="generate-box">
      <span>✨</span>
      <h3>这个项目还没有岗位分析</h3>
      <p>点击后会用当前 AI Provider 生成一份 JD 要求与简历证据映射。</p>
      <button className="app-primary-button fit" disabled={isGenerating} onClick={generateAnalysis} type="button">
        {isGenerating ? "正在生成..." : "生成岗位分析"}
      </button>
      {error ? <p className="app-alert error">{error}</p> : null}
    </div>
  );
}

