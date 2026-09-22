"use client";

import { FormEvent, useMemo, useState } from "react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const starterQuestions = [
  "这个岗位最看重哪些能力？",
  "我简历里哪些地方需要重点改？",
  "根据这个 JD，面试前应该补哪些知识？",
];

export function ProjectChat({ projectId, provider }: { projectId: string; provider: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "你可以继续问我这个岗位和简历怎么匹配、哪些经历要突出、面试前要补什么。当前回答会基于这个项目的 JD、简历解析和岗位分析。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSend = useMemo(() => input.trim().length > 0 && !isSending, [input, isSending]);

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.filter((message) => message.role === "user" || message.role === "assistant").slice(-12),
        }),
      });
      const body = (await response.json()) as {
        message?: ChatMessage;
        error?: { message?: string };
      };
      if (!response.ok || !body.message) {
        throw new Error(body.error?.message ?? "AI 回复失败，请稍后重试。");
      }
      setMessages([...nextMessages, body.message]);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI 回复失败，请稍后重试。");
      setMessages(nextMessages);
    } finally {
      setIsSending(false);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <section className="app-card chat-card">
      <div className="section-head">
        <div>
          <p className="app-kicker">AI Chat</p>
          <h2>和大模型继续聊</h2>
        </div>
        <span className="app-pill">Provider：{provider}</span>
      </div>
      <p className="section-desc">围绕这个 JD 和简历继续追问。觉得回答不合适，后续我们再调提示词和规则。</p>

      <div className="chat-starters">
        {starterQuestions.map((question) => (
          <button disabled={isSending} key={question} onClick={() => void sendMessage(question)} type="button">
            {question}
          </button>
        ))}
      </div>

      <div className="chat-messages">
        {messages.map((message, index) => (
          <div className={`chat-message ${message.role}`} key={`${message.role}-${index}`}>
            <span>{message.role === "user" ? "你" : "AI"}</span>
            <p>{message.content}</p>
          </div>
        ))}
        {isSending ? (
          <div className="chat-message assistant">
            <span>AI</span>
            <p>正在思考...</p>
          </div>
        ) : null}
      </div>

      {error ? <p className="app-alert error">{error}</p> : null}

      <form className="chat-form" onSubmit={submit}>
        <textarea
          onChange={(event) => setInput(event.target.value)}
          placeholder="例如：我有一个摄像头项目，但写得很少，应该怎么针对这个 JD 强调？"
          value={input}
        />
        <button disabled={!canSend} type="submit">
          发送
        </button>
      </form>
    </section>
  );
}


