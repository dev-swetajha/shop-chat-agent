import fetch from "node-fetch";

export function createDeepSeekService(apiKey = process.env.DEEPSEEK_API_KEY) {
  const apiUrl = "https://api.deepseek.com/v1/chat/completions";

  async function streamChat({ messages, tools, onText, onMessage, onToolUse, onContentBlock }) {
    const controller = new AbortController();

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages,
        stream: true,
        tools
      }),
      signal: controller.signal
    });

    if (!response.ok || !response.body) {
      throw new Error("Failed to connect to DeepSeek API.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let finalMessage = { role: "assistant", content: "" };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n").filter(line => line.trim() !== "");

      for (const line of lines) {
        if (line.startsWith("data:")) {
          const data = JSON.parse(line.replace("data: ", ""));
          const delta = data.choices?.[0]?.delta?.content;
          if (delta) {
            finalMessage.content += delta;
            onText(delta);
          }

          // Handle tool calls, etc., as per DeepSeek's streaming format
        }
      }
    }

    onMessage(finalMessage);
    return finalMessage;
  }

  return {
    streamChat
  };
}
