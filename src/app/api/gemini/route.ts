import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { messages, systemPrompt } = await req.json();
  const GROQ_KEY = process.env.GROQ_API_KEY;

  if (!GROQ_KEY) {
    return NextResponse.json({ text: "API key not configured." });
  }

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
    console.log("Groq response status:", response.status);
    console.log("Groq data:", JSON.stringify(data).slice(0, 300));
    const text = data?.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
    return NextResponse.json({ text });
  } catch (e: any) {
    console.log("Groq error:", e.message);
    return NextResponse.json({ text: "Error: " + e.message });
  }
}