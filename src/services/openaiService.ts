import { OpenAI } from "openai";

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(
    context: string,
    question: string,
  ): Promise<string | null> {
    try {
      const aiResponse = await this.openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "user",
            content: `The following is a context:\n${context}\n\nBased on this context, how would the person answer the following job-related question?\n\nQuestion: ${question}\n\nAnswer:`,
          },
        ],
        max_tokens: 300,
      });

      console.trace(
        "Sending response: ",
        aiResponse.choices[0].message.content,
      );

      return aiResponse.choices[0].message.content;
    } catch (error) {
      console.error("Error with OpenAI API:", error);
      throw new Error("There was an error processing your request.");
    }
  }
}
