import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  app.use(express.json());

  // Health check endpoint for Cloud Run
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Modern lightweight Gemini models prioritized for sub-second latency, structured JSON reliability, and high throughput
  const LIGHTWEIGHT_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
    "gemini-3.8-flash"
  ];

  async function generateWithFallback(ai: GoogleGenAI, callParams: any) {
    let lastError: any = null;
    for (const model of LIGHTWEIGHT_MODELS) {
      try {
        const res = await ai.models.generateContent({
          ...callParams,
          model
        });
        return res;
      } catch (err: any) {
        console.warn(`[Gemini Fallback] Model ${model} encountered error: ${err?.message || err}. Trying next fallback...`);
        lastError = err;
      }
    }
    throw lastError;
  }

  // API route for generating questions
  app.post("/api/generate-question", async (req, res) => {
    try {
      const { prompt, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "API key is not configured on the server." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await generateWithFallback(ai, {
        contents: prompt || "Tạo 1 câu hỏi trắc nghiệm ngẫu nhiên, vui nhộn.",
        config: {
          responseMimeType: "application/json",
          systemInstruction: "Bạn là một trợ lý ảo chuyên tạo câu hỏi trắc nghiệm. Hãy luôn trả về đúng định dạng JSON.",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              questionText: {
                type: Type.STRING,
                description: "Nội dung câu hỏi",
              },
              options: {
                type: Type.ARRAY,
                items: {
                  type: Type.STRING,
                },
                description: "Danh sách 4 phương án (ví dụ: A. xxx, B. yyy, C. zzz, D. www)",
              },
              correctAnswerIndex: {
                type: Type.INTEGER,
                description: "Vị trí của đáp án đúng (từ 0 đến 3)",
              }
            },
            required: ["questionText", "options", "correctAnswerIndex"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No text returned from Gemini");
      }

      const data = JSON.parse(response.text.trim());
      res.json(data);
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "Đã có lỗi xảy ra khi gọi AI." });
    }
  });

  // API route for multilingual live question translation
  app.post("/api/translate-question", async (req, res) => {
    try {
      const { question_text, options, explanation, target_lang, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ 
          error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm key vào .env hoặc truyền qua request." 
        });
      }

      if (!question_text || !target_lang) {
        return res.status(400).json({ error: "Thiếu trường question_text hoặc target_lang bắt buộc." });
      }

      const targetLangNames: Record<string, string> = {
        en: "English",
        zh: "Chinese (Simplified)",
        ja: "Japanese",
        ko: "Korean",
        fr: "French",
        es: "Spanish",
        de: "German",
        th: "Thai",
        lo: "Lao",
        km: "Khmer",
        ru: "Russian"
      };

      const langName = targetLangNames[target_lang] || target_lang;

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const prompt = `You are a professional academic quiz translator for a live cybersecurity gameshow.
Task: Translate this entire quiz payload from Vietnamese into ${langName} (${target_lang}).
Guidelines:
1. Translate the question text into natural, idiomatic ${langName}.
2. Translate ALL answer choices/options in "options" from Vietnamese into ${langName}. Preserve the keys (A, B, C, D, E, F) exactly. Every option string must be fully translated so players can read all answers in ${langName}.
3. If explanation is provided, translate it accurately into ${langName}.
4. Keep standard acronyms and terms precise (e.g., OTP, HTTPS, Phishing, Deepfake, DDoS, Firewall, Zero Trust, Ransomware, Malware, SQL Injection).
5. Return strictly JSON matching the specified schema.

Source payload:
${JSON.stringify({
  question_text,
  options: options || {},
  explanation: explanation || ""
})}`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a specialized translator for an academic cybersecurity live gameshow. Translate question text, all option answers, and explanation precisely into the target foreign language. Maintain concise wording suited for rapid live countdown display.",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              question_text: {
                type: Type.STRING,
                description: `Question translated into ${langName}`
              },
              options: {
                type: Type.OBJECT,
                description: `Map of all answer options translated from Vietnamese into ${langName} with original keys intact`,
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                  E: { type: Type.STRING },
                  F: { type: Type.STRING }
                }
              },
              explanation: {
                type: Type.STRING,
                description: `Explanation translated into ${langName}`
              }
            },
            required: ["question_text", "options"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No response text returned from translation model");
      }

      const translation = JSON.parse(response.text.trim());
      res.json({
        target_lang,
        translation
      });
    } catch (error: any) {
      console.error("Gemini Translation Error:", error);
      res.status(500).json({ error: error.message || "Đã có lỗi xảy ra khi dịch câu hỏi." });
    }
  });

  // API route for translating short answers or terms into Vietnamese (Tiếng Việt)
  app.post("/api/translate-short-answer", async (req, res) => {
    try {
      const { text, target_lang = 'vi', context, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm key vào .env hoặc truyền qua request." 
        });
      }

      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ error: "Thiếu trường 'text' bắt buộc." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const isToVietnamese = target_lang === 'vi';
      const prompt = isToVietnamese
        ? `Translate this short answer, response, phrase, or cybersecurity term into natural, precise Vietnamese (Tiếng Việt).
Original text: "${text.trim()}"
${context ? `Context: ${context}` : ''}
Guidelines:
- If it is already Vietnamese, return it cleaned up.
- If it is an English / foreign term or sentence, translate it accurately into Vietnamese.
- Preserve standard acronyms if widely used in Vietnamese IT (e.g. OTP, DDoS, HTTPS, API, SQL), but explain or translate the concept naturally.
- Keep the translation concise, direct, and ideal for short-answer gameshow scoring.
Return strictly JSON.`
        : `Translate this short answer or term into the target language "${target_lang}".
Original text: "${text.trim()}"
${context ? `Context: ${context}` : ''}
Return strictly JSON.`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a specialized linguistic translator for a live cybersecurity gameshow. Translate short answers, terms, and responses concisely and accurately.",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translated_text: {
                type: Type.STRING,
                description: "The translated short answer text"
              },
              detected_lang: {
                type: Type.STRING,
                description: "Detected source language code"
              }
            },
            required: ["translated_text"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No translation returned");
      }

      const result = JSON.parse(response.text.trim());
      res.json({
        original_text: text.trim(),
        translated_text: result.translated_text,
        target_lang,
        detected_lang: result.detected_lang || 'unknown'
      });
    } catch (error: any) {
      console.error("Short Answer Translation Error:", error);
      res.status(500).json({ error: error.message || "Đã có lỗi xảy ra khi dịch câu trả lời ngắn." });
    }
  });

  // API route for batch translating answer options from Vietnamese into foreign languages
  app.post("/api/translate-answers", async (req, res) => {
    try {
      const { options, target_lang, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;

      if (!apiKey) {
        return res.status(400).json({ 
          error: "Chưa cấu hình GEMINI_API_KEY. Vui lòng thêm key vào .env hoặc truyền qua request." 
        });
      }

      if (!options || typeof options !== 'object' || !target_lang) {
        return res.status(400).json({ error: "Thiếu trường 'options' hoặc 'target_lang' bắt buộc." });
      }

      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });

      const prompt = `Translate these quiz answer choices from Vietnamese into target language "${target_lang}".
Preserve all original keys (e.g., A, B, C, D, E, F).
Options:
${JSON.stringify(options, null, 2)}
Return strictly JSON with the translated options.`;

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          systemInstruction: "You are a specialized translator for quiz options. Translate all option values from Vietnamese into the specified target language while preserving the keys.",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              options: {
                type: Type.OBJECT,
                properties: {
                  A: { type: Type.STRING },
                  B: { type: Type.STRING },
                  C: { type: Type.STRING },
                  D: { type: Type.STRING },
                  E: { type: Type.STRING },
                  F: { type: Type.STRING }
                }
              }
            },
            required: ["options"]
          }
        }
      });

      if (!response.text) {
        throw new Error("No response returned");
      }

      const result = JSON.parse(response.text.trim());
      res.json({
        translated_options: result.options || {},
        target_lang
      });
    } catch (error: any) {
      console.error("Answer Translation Error:", error);
      res.status(500).json({ error: error.message || "Đã có lỗi xảy ra khi dịch đáp án." });
    }
  });

  // API route for summarizing audience interactions (Shouts or Q&A)
  app.post("/api/summarize-audience", async (req, res) => {
    try {
      const { type, data, apiKey: clientApiKey } = req.body;
      const apiKey = clientApiKey || process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(500).json({ error: "API key is not configured on the server." });
      }
      
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'aistudio-build' }
        }
      });
      
      let prompt = "";
      if (type === 'SHOUTS') {
        prompt = `Hãy đóng vai một trợ lý AI phân tích bầu không khí sự kiện. Dưới đây là danh sách các tin nhắn/tiếng hô cổ vũ (shout) của khán giả trong ít phút vừa qua:\n\n${JSON.stringify(data)}\n\nHãy tóm tắt ngắn gọn trong 2-3 câu (tối đa 50 từ): Khán giả đang cảm thấy thế nào? Ai đang được cổ vũ nhiều nhất? Từ khóa nào xuất hiện nhiều? Hãy viết với giọng điệu năng động, MC có thể đọc ngay để khuấy động sân khấu.`;
      } else if (type === 'QA') {
        prompt = `Hãy đóng vai một trợ lý AI phân tích sự kiện. Dưới đây là danh sách các câu hỏi mà khán giả vừa gửi:\n\n${JSON.stringify(data)}\n\nHãy tóm tắt ngắn gọn trong 3-4 ý gạch đầu dòng: Đâu là những chủ đề chính/câu hỏi được quan tâm nhiều nhất? Có xu hướng chung nào trong các câu hỏi không? Phù hợp để MC tham khảo đọc lên sân khấu.`;
      } else {
        return res.status(400).json({ error: "Loại dữ liệu không hợp lệ." });
      }

      const response = await generateWithFallback(ai, {
        contents: prompt,
        config: {
          systemInstruction: "Bạn là trợ lý ảo phân tích tương tác trực tiếp cho MC sự kiện. Trả lời ngắn gọn, súc tích, văn phong tự nhiên, chuyên nghiệp.",
        }
      });

      if (!response.text) {
        throw new Error("No text returned from Gemini");
      }

      res.json({ summary: response.text.trim() });
    } catch (error: any) {
      console.error("Gemini Summarize Error:", error);
      res.status(500).json({ error: error.message || "Lỗi khi gọi AI tóm tắt." });
    }
  });

  const isProduction = process.env.NODE_ENV === "production";

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      setHeaders: (res) => {
        res.set('Access-Control-Allow-Origin', '*');
      }
    }));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath, (err) => {
          if (err && !res.headersSent) {
            res.status(500).send('Error serving application.');
          }
        });
      } else {
        res.status(404).send('Application build not found.');
      }
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  // Graceful shutdown handling for container environments (Cloud Run)
  process.on('SIGTERM', () => {
    console.log('SIGTERM signal received. Closing server gracefully...');
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
  });

  process.on('SIGINT', () => {
    console.log('SIGINT signal received. Closing server gracefully...');
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });
  });
}

startServer().catch((err) => {
  console.error("Fatal error starting server:", err);
  process.exit(1);
});
