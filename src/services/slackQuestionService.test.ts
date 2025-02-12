import { SlackQuestionService } from './slackQuestionService';
import { ContextService } from './contextService';
import { RateLimitService } from './rateLimitService';
import { OpenAIService } from './openaiService';

jest.mock('./contextService');
jest.mock('./rateLimitService');
jest.mock('./openaiService');

describe('SlackQuestionService', () => {
  let slackQuestionService: SlackQuestionService;
  let contextService: ContextService;
  let rateLimitService: RateLimitService;
  let openaiService: OpenAIService;
  let respond: jest.Mock;

  beforeEach(() => {
    slackQuestionService = new SlackQuestionService();
    contextService = new ContextService();
    rateLimitService = new RateLimitService();
    openaiService = new OpenAIService('fake-api-key');
    respond = jest.fn();
  });

  describe('handleQuestion', () => {
    it('should respond with an error if history is missing', async () => {
      contextService.getContext = jest.fn().mockReturnValue('context');
      contextService.getHistory = jest.fn().mockReturnValue(null);

      await slackQuestionService.handleQuestion(
        'U123',
        'question',
        respond,
        contextService,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context first using `/addhistory`.',
      });
    });

    it('should respond with an error if context is missing', async () => {
      contextService.getContext = jest.fn().mockReturnValue(null);
      contextService.getHistory = jest.fn().mockReturnValue('history');

      await slackQuestionService.handleQuestion(
        'U123',
        'question',
        respond,
        contextService,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context first using `/setcontext`.',
      });
    });

    it('should respond with a rate limit error if rate limit is exceeded', async () => {
      contextService.getContext = jest.fn().mockReturnValue('context');
      contextService.getHistory = jest.fn().mockReturnValue('history');
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(false);
      rateLimitService.getTimeUntilReset = jest.fn().mockReturnValue(10);

      await slackQuestionService.handleQuestion(
        'U123',
        'question',
        respond,
        contextService,
        rateLimitService,
        openaiService
      );

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'You have reached the limit of requests per hour. Please try again in 10 minutes.',
      });
    });

    it('should call OpenAIService and respond with an answer', async () => {
      contextService.getContext = jest.fn().mockReturnValue('context');
      contextService.getHistory = jest.fn().mockReturnValue('history');
      rateLimitService.canProceedWithRequest = jest.fn().mockReturnValue(true);
      openaiService.generateEnhancedMetadata = jest.fn().mockResolvedValue('metadata');
      openaiService.generateResponseWithMetadata = jest.fn().mockResolvedValue('answer');

      await slackQuestionService.handleQuestion(
        'U123',
        'question',
        respond,
        contextService,
        rateLimitService,
        openaiService
      );

      expect(openaiService.generateEnhancedMetadata).toHaveBeenCalledWith('context', null);
      expect(openaiService.generateResponseWithMetadata).toHaveBeenCalledWith('context', 'metadata', 'question');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: "Here's how your context might answer this question:\n*question*\n\nanswer",
      });
    });
  });

  describe('handleAddToHistory', () => {
    it('should respond with an error if history text is empty', async () => {
      await slackQuestionService.handleAddToHistory('U123', '', respond, contextService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide text to add to history.',
      });
    });

    it('should add history and respond with success message', async () => {
      await slackQuestionService.handleAddToHistory('U123', 'history text', respond, contextService);

      expect(contextService.addToHistory).toHaveBeenCalledWith('U123', 'history text');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your history has been updated.',
      });
    });
  });

  describe('handleSetData', () => {
    it('should respond with an error if context text is empty', async () => {
      await slackQuestionService.handleSetData('U123', '', respond, contextService);

      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Please provide your context text in the message after `/context`.',
      });
    });

    it('should save context and respond with success message', async () => {
      await slackQuestionService.handleSetData('U123', 'context text', respond, contextService);

      expect(contextService.saveContext).toHaveBeenCalledWith('U123', 'context text');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your context has been saved! You can now use `/question` to get an answer based on your context.',
      });
    });
  });

  describe('handleClearHistory', () => {
    it('should clear history and respond with success message', async () => {
      await slackQuestionService.handleClearHistory('U123', respond, contextService);

      expect(contextService.clearHistory).toHaveBeenCalledWith('U123');
      expect(respond).toHaveBeenCalledWith({
        response_type: 'ephemeral',
        text: 'Your history has been cleared.',
      });
    });
  });
});
