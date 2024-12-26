import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { SlackHandlers } from './slackHandlers';
import { OpenAIService } from '../services/openaiService';
import { ContextService } from '../services/contextService';
import { RateLimitService } from '../services/rateLimitService';

jest.mock('../services/openaiService');
jest.mock('../services/contextService');
jest.mock('../services/rateLimitService');

describe('SlackHandlers', () => {
  let slackHandlers: SlackHandlers;
  let openaiService: OpenAIService;
  let contextService: ContextService;
  let rateLimitService: RateLimitService;

  beforeEach(() => {
    openaiService = new OpenAIService('fake-api-key');
    contextService = new ContextService();
    jest.spyOn(contextService, 'saveContext');
    rateLimitService = new RateLimitService();
    slackHandlers = new SlackHandlers(openaiService, contextService, rateLimitService);
  });

  describe('handleSetData', () => {
    it('should save context and respond with success message', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'context text' } as any;

      await slackHandlers.handleSetData({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(contextService.saveContext).toHaveBeenCalledWith('U123', 'context text');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your context has been saved! You can now use `/question` to get an answer based on your context.',
      });
    });

    it('should respond with error message if context text is empty', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: '' } as any;

      await slackHandlers.handleSetData({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context text in the message after `/context`.',
      });
    });
  });

  describe('handleQuestion', () => {
    it('should respond with answer if context and history are available', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'question' } as any;
      contextService.getContext = jest.fn().mockReturnValue('context');
      contextService.getHistory = jest.fn().mockReturnValue('history');
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(true);
      openaiService.generateResponse = jest.fn().mockResolvedValue('answer');

      await slackHandlers.handleQuestion({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(openaiService.generateResponse).toHaveBeenCalledWith('context', 'history', 'question');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        // eslint-disable-next-line quotes
        text: "Here's how your context might answer this question:\n*question*\n\nanswer",
      });
    });

    it('should respond with error if context is missing', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'question' } as any;
      contextService.getContext = jest.fn().mockReturnValue(null);
      contextService.getHistory = jest.fn().mockReturnValue('history');

      await slackHandlers.handleQuestion({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context first using `/setcontext`.',
      });
    });

    it('should respond with error if history is missing', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'question' } as any;
      contextService.getContext = jest.fn().mockReturnValue('context');
      contextService.getHistory = jest.fn().mockReturnValue(null);

      await slackHandlers.handleQuestion({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context first using `/addhistory`.',
      });
    });

    it('should respond with rate limit error if rate limit is exceeded', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'question' } as any;
      contextService.getContext = jest.fn().mockReturnValue('context');
      contextService.getHistory = jest.fn().mockReturnValue('history');
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(false);
      rateLimitService.getTimeUntilReset = jest.fn().mockReturnValue(10);

      await slackHandlers.handleQuestion({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });
  });

  describe('handleAddToHistory', () => {
    it('should add to history and respond with success message', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'history text' } as any;

      await slackHandlers.handleAddToHistory({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(contextService.addToHistory).toHaveBeenCalledWith('U123', 'history text');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your history has been updated.',
      });
    });

    it('should respond with error message if history text is empty', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: '' } as any;

      await slackHandlers.handleAddToHistory({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide text to add to history.',
      });
    });
  });

  describe('handleClearHistory', () => {
    it('should clear history and respond with success message', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123' } as any;

      await slackHandlers.handleClearHistory({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(contextService.clearHistory).toHaveBeenCalledWith('U123');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your history has been cleared.',
      });
    });
  });

  describe('handleSummarize', () => {
    it('should respond with summary of recent messages', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const client = {
        conversations: {
          history: jest.fn().mockResolvedValue({ messages: [{ text: 'message' }] }),
        },
      };
      const command = { user_id: 'U123', channel_id: 'C123' } as any;
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(true);
      openaiService.generateSummary = jest.fn().mockResolvedValue('summary');

      await slackHandlers.handleSummarize({
        command,
        ack,
        respond,
        client,
      } as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(client.conversations.history).toHaveBeenCalledWith({
        channel: 'C123',
        limit: 20,
      });
      expect(openaiService.generateSummary).toHaveBeenCalledWith('message');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'in_channel',
        text: 'Summary of the recent conversation:\nsummary',
      });
    });

    it('should respond with error if no messages are found', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const client = {
        conversations: {
          history: jest.fn().mockResolvedValue({ messages: [] }),
        },
      };
      const command = { user_id: 'U123', channel_id: 'C123' } as any;
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(true);

      await slackHandlers.handleSummarize({
        command,
        ack,
        respond,
        client,
      } as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(client.conversations.history).toHaveBeenCalledWith({
        channel: 'C123',
        limit: 20,
      });
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'No messages found in the channel.',
      });
    });

    it('should respond with rate limit error if rate limit is exceeded', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const client = { conversations: { history: jest.fn() } };
      const command = { user_id: 'U123', channel_id: 'C123' } as any;
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(false);
      rateLimitService.getTimeUntilReset = jest.fn().mockReturnValue(10);

      await slackHandlers.handleSummarize({
        command,
        ack,
        respond,
        client,
      } as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });
  });
});
