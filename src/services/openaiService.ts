import { OpenAI } from 'openai';
import { UserMap } from '../userMap.dto';

export interface Metadata {
  actions: string[];
  decisions: string[];
  participants: string[];
  sentiment: string;
  topics: string[];
}

export class OpenAIService {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({
      apiKey,
      defaultQuery: {
        'api-version': '2024-08-01-preview',
      },
      defaultHeaders: {
        'api-key': apiKey,
      },
      baseURL: 'https://ais-slack-dev-eastus2-01.cognitiveservices.azure.com/openai/deployments/gpt-4o-slack-poc', // '/chat/completions?api-version=2024-08-01-preview',
    });
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
        // model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        // max_tokens: 300,
      } as any);

      return aiResponse.choices[0].message.content;
    } catch (_error) {
      throw new Error('There was an error processing your request.');
    }
  }

  async generateSummary(context: string, options: { focus?: string; length?: string } = {}): Promise<string | null> {
    if (!context) {
      return null;
    }

    const { focus = 'general', length = 'short' } = options;

    const prompt = `
      Please provide a ${length} summary focusing on ${focus} of the following conversation:

      ${context}
    `;

    try {
      const aiResponse = await this.openai.chat.completions.create({
        // model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt.trim(),
          },
        ],
        // max_tokens: length === 'short' ? 150 : 300,
      } as any);

      return aiResponse.choices[0].message.content;
    } catch (_error) {
      throw new Error('There was an error generating the summary.');
    }
  }

  async generatePartialSummary(context: string): Promise<string | null> {
    if (!context) {
      return null;
    }
    try {
      const prompt = `
        The following conversation is too long to summarize in full. Please provide a partial summary of the most recent messages:

        ${context}
      `;

      const aiResponse = await this.openai.chat.completions.create({
        // model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: prompt.trim(),
          },
        ],
        // max_tokens: 150,
      } as any);

      return aiResponse.choices[0].message.content;
    } catch (_error) {
      throw new Error('There was an error generating the partial summary.');
    }
  }

  async generateEnhancedMetadata(combinedMessages: string, usersMap: UserMap): Promise<Metadata> {
    const participants = Object.values(usersMap);

    const prompt = `
    Please analyze the following conversation to extract actionable insights. Focus on listing these out as string[] only:
    - **Key Topics Discussed:** Summarize the main subjects of discussion.
    - **Sentiment Analysis:** Determine the overall tone (positive, neutral, negative).
    - **Actionable Items:** Clearly list specific tasks as string only with follow-ups required, detailing who is responsible and any deadlines, if mentioned.
    - **Decision Points:** Note any decisions made or pending that require attention.
  
    Here is the conversation:
    ${combinedMessages}
  
    Format the output as a JSON object with keys "topics", "sentiment", "actions", and "decisions".
  `;

    try {
      const aiResponse = await this.openai.chat.completions.create({
        // model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        // max_tokens: 300,
      } as any);

      console.debug('ENHANCE METADATA', aiResponse.choices);

      const { content } = aiResponse.choices[0].message;
      if (typeof content !== 'string') {
        throw new Error('AI response content is not a string.');
      }

      const jsonString = content.replace(/```json\n|```/g, '');
      const serializedMetadata = JSON.parse(jsonString);

      return { ...serializedMetadata, participants };
    } catch (error) {
      console.error('Error generating enhanced metadata:', error);
      throw new Error('Error generating enhanced metadata.');
    }
  }

  async generateResponseWithMetadata(context: string, metadata: Metadata, question: string): Promise<string | null> {
    try {
      const prompt = `
      The following text is a summary of a conversation, supplemented with key metadata:
      ${context}
    
      Additional extracted metadata:
      - **Key Topics:** ${metadata.topics.join(', ')}
      - **Action Items:** ${metadata.actions.join(', ')}
      - **Decisions:** ${metadata.decisions.join(', ')}
    
      Using this information, provide a comprehensive and thoughtful response to the question below. Ensure the response is concise and actionable:
      Question: ${question}
    
      Answer:
    `;

      const aiResponse = await this.openai.chat.completions.create({
        // model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        // max_tokens: 300,
      } as any);

      console.log('RESPONSE WITH METADATA', aiResponse.choices);

      return aiResponse.choices[0].message.content;
    } catch (error) {
      console.error('Error generating response with metadata:', error);
      throw new Error('Error generating response with metadata.');
    }
  }
}
