import { AllMiddlewareArgs, SlackCommandMiddlewareArgs } from '@slack/bolt';
import { SlackHandlers } from './slackHandlers';
import { OpenAIService } from '../services/openaiService';
import { ContextService } from '../services/contextService';
import { RateLimitService } from '../services/rateLimitService';
import { SlackSummaryService } from '../services/slackSummaryService';
import { SlackQuestionService } from '../services/slackQuestionService';

jest.mock('../services/openaiService');
jest.mock('../services/contextService');
jest.mock('../services/rateLimitService');
jest.mock('../services/slackSummaryService');
jest.mock('../services/slackQuestionService');

describe('SlackHandlers', () => {
  let slackHandlers: SlackHandlers;
  let openaiService: OpenAIService;
  let contextService: ContextService;
  let rateLimitService: RateLimitService;
  let slackSummaryService: SlackSummaryService;
  let slackQuestionService: SlackQuestionService;

  beforeEach(() => {
    openaiService = new OpenAIService('fake-api-key');
    contextService = new ContextService();
    rateLimitService = new RateLimitService();
    slackSummaryService = new SlackSummaryService();
    slackQuestionService = new SlackQuestionService();
    slackHandlers = new SlackHandlers(
      openaiService,
      contextService,
      rateLimitService,
      slackSummaryService,
      slackQuestionService
    );
  });

  describe('handleSetData', () => {
    it('should call handleSetData of SlackQuestionService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'context text' } as any;
      jest.spyOn(slackQuestionService, 'handleSetData').mockResolvedValue();

      await slackHandlers.handleSetData({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackQuestionService.handleSetData).toHaveBeenCalledWith('U123', 'context text', respond, contextService);
    });
  });

  // Similarly update other test cases to check for the correct service method calls
  // For example, handleQuestion should verify that slackQuestionService.handleQuestion is called

  describe('handleQuestion', () => {
    it('should call handleQuestion of SlackQuestionService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'question' } as any;
      jest.spyOn(slackQuestionService, 'handleQuestion').mockResolvedValue();

      await slackHandlers.handleQuestion({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackQuestionService.handleQuestion).toHaveBeenCalledWith(
        'U123',
        'question',
        respond,
        contextService,
        rateLimitService,
        openaiService
      );
    });
  });

  // Continue with similar updates for handleAddToHistory, handleClearHistory, handleSummarizeThread, etc.

  describe('handleSummarizeThread', () => {
    it('should call handleSummarizeThread of SlackSummaryService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const client = {
        conversations: {
          replies: jest.fn().mockResolvedValue({ messages: [{ text: 'message' }] }),
        },
      };
      const command = { user_id: 'U123', channel_id: 'C123', text: 'thread_ts' } as any;
      jest.spyOn(slackSummaryService, 'handleSummarizeThread').mockResolvedValue();

      await slackHandlers.handleSummarizeThread({
        command,
        ack,
        respond,
        client,
        context: {},
      } as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackSummaryService.handleSummarizeThread).toHaveBeenCalledWith(
        'U123',
        'C123',
        undefined,
        respond,
        client,
        rateLimitService,
        openaiService
      );
    });
  });

  describe('handleAddToHistory', () => {
    it('should call handleAddToHistory of SlackQuestionService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123', text: 'history text' } as any;
      jest.spyOn(slackQuestionService, 'handleAddToHistory').mockResolvedValue();

      await slackHandlers.handleAddToHistory({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackQuestionService.handleAddToHistory).toHaveBeenCalledWith(
        'U123',
        'history text',
        respond,
        contextService
      );
    });
  });

  describe('handleClearHistory', () => {
    it('should call handleClearHistory of SlackQuestionService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const command = { user_id: 'U123' } as any;
      jest.spyOn(slackQuestionService, 'handleClearHistory').mockResolvedValue();

      await slackHandlers.handleClearHistory({
        command,
        ack,
        respond,
      } as unknown as SlackCommandMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackQuestionService.handleClearHistory).toHaveBeenCalledWith('U123', respond, contextService);
    });
  });

  describe('handleSummarizeThread', () => {
    it('should call handleSummarizeThread of SlackSummaryService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const client = {
        conversations: {
          replies: jest.fn().mockResolvedValue({ messages: [{ text: 'message' }] }),
        },
      };
      const command = { user_id: 'U123', channel_id: 'C123', text: 'thread_ts' } as any;
      jest.spyOn(slackSummaryService, 'handleSummarizeThread').mockResolvedValue();

      await slackHandlers.handleSummarizeThread({
        command,
        ack,
        respond,
        client,
        context: {},
      } as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackSummaryService.handleSummarizeThread).toHaveBeenCalledWith(
        'U123',
        'C123',
        undefined,
        respond,
        client,
        rateLimitService,
        openaiService
      );
    });

    // Add test cases for error scenarios and rate limiting as needed
  });

  describe('handleSummarizeChannel', () => {
    it('should call handleSummarizeChannel of SlackSummaryService', async () => {
      const ack = jest.fn();
      const respond = jest.fn();
      const client = {
        conversations: {
          history: jest.fn().mockResolvedValue({ messages: [{ text: 'message' }] }),
        },
      };
      const command = { user_id: 'U123', channel_id: 'C123', text: '7' } as any;
      jest.spyOn(slackSummaryService, 'handleSummarizeChannel').mockResolvedValue();

      await slackHandlers.handleSummarizeChannel({
        command,
        ack,
        respond,
        client,
      } as unknown as SlackCommandMiddlewareArgs & AllMiddlewareArgs);

      expect(ack).toHaveBeenCalled();
      expect(slackSummaryService.handleSummarizeChannel).toHaveBeenCalledWith(
        'U123',
        'C123',
        7,
        'general',
        respond,
        client,
        rateLimitService,
        openaiService
      );
    });

    // Add test cases for error scenarios and rate limiting as needed
  });
});
