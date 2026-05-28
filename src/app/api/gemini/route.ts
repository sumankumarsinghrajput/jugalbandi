import { NextRequest, NextResponse } from "next/server";

const GROQ_KEY = process.env.GROQ_API_KEY || "";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json();

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${GROQ_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
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
  } catch (e: any) {
    return NextResponse.json({ text: "Error: " + e.message });
  }
}