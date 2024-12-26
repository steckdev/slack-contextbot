import { OpenAI } from 'openai';

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async generateResponse(context: string, history: string[], question: string): Promise<string | null> {
    try {
      // Build a consolidated prompt using the current context and historical context
      const historicalContext = history.length > 0 ? history.join('\n\n') : 'No historical context available.';

      const prompt = `
        The following is the user's current context:\n${context}
  
        Additionally, here is the user's history, which may provide further insights into their background:\n${historicalContext}
  
        Based on both the current context and history, please provide a thoughtful answer to the following question as if they are answering a survey:\n
  
        Question: ${question}
  
        Answer:
      `;

      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
      });

      // console.info('Sending response: ', aiResponse.choices[0].message.content);
      return aiResponse.choices[0].message.content;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // console.error('Error with OpenAI API:', (error as Error).message);
      throw new Error('There was an error processing your request.');
    }
  }

  async generateSummary(context: string): Promise<string | null> {
    if (!context) {
      return null;
    }
    try {
      const prompt = `
        Please provide a concise summary of the following conversation in three sentences or less:

        ${context}
      `;

      const aiResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt.trim(),
          },
        ],
        max_tokens: 150,
      });

      return aiResponse.choices[0].message.content;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      // console.error('Error in generateSummary:', (error as Error).message);
      throw new Error('There was an error generating the summary.');
    }
  }
}
