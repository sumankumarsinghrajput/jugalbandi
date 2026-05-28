import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json();

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.GEMINI_API_KEY}`,
      "HTTP-Referer": "https://jugalbandii.vercel.app",
      "X-Title": "Jugalbandi AI",
    },
    body: JSON.stringify({
      model: "meta-llama/llama-3.1-8b-instruct:free",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role === "model" ? "assistant" : "user",
          content: m.parts[0].text,
        })),
      ],
      max_tokens: 1024,
    }),
  });

  const data = await response.json();
  const text = data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
  return NextResponse.json({ text });
}