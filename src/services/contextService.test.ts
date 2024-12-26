import { ContextService } from './contextService';

describe('ContextService', () => {
  let contextService: ContextService;

  beforeEach(() => {
    contextService = new ContextService();
  });

  it('should save and retrieve user context', () => {
    const userId = 'U12345';
    const context = 'This is my context.';

    contextService.saveContext(userId, context);

    expect(contextService.getContext(userId)).toBe(context);
  });

  it('should add to history and retrieve it', () => {
    const userId = 'U12345';
    const context1 = 'Context 1';
    const context2 = 'Context 2';

    contextService.saveContext(userId, context1);
    contextService.saveContext(userId, context2);

    const history = contextService.getHistory(userId);
    expect(history.length).toBe(1);
    expect(history[0]).toBe(context1);
  });

  it('should clear user history', () => {
    const userId = 'U12345';
    contextService.saveContext(userId, 'Initial Context');
    contextService.addToHistory(userId, 'Previous Context');

    contextService.clearHistory(userId);
    expect(contextService.getHistory(userId).length).toBe(0);
  });

  it('should replace context', () => {
    const userId = 'U12345';
    const newContext = 'New context';

    contextService.replaceContext(userId, newContext);
    expect(contextService.getContext(userId)).toBe(newContext);
  });
});
