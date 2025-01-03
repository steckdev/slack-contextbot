import { OpenAIService } from './openaiService';

jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{ message: { content: 'AI-generated response' } }],
            }),
          },
        },
      };
    }),
  };
});

describe('OpenAIService', () => {
  let openaiService: OpenAIService;

  beforeEach(() => {
    openaiService = new OpenAIService('fake-api-key');
  });

  it('should return a response from the OpenAI API', async () => {
    const context = 'This is the context.';
    const question = 'What can you tell me about AI?';
    const history = ['Previous history'];

    const response = await openaiService.generateResponse(context, history, question);

    expect(response).toBe('AI-generated response');
  });
});
