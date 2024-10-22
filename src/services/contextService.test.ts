import { ContextService } from "../../src/services/contextService";

describe("ContextService", () => {
  let contextService: ContextService;

  beforeEach(() => {
    contextService = new ContextService();
  });

  it("should save and retrieve user context", () => {
    const userId = "U12345";
    const context = "This is my context.";

    contextService.saveContext(userId, context);

    expect(contextService.getContext(userId)).toBe(context);
  });

  it("should handle rate limiting correctly", () => {
    const userId = "U12345";

    contextService.saveContext(userId, "Test Context");

    // Should proceed with the first request
    expect(contextService.canProceedWithRequest(userId)).toBe(true);

    // Simulate 20 requests
    for (let i = 0; i < 20; i++) {
      contextService.canProceedWithRequest(userId);
    }

    // Should now be rate-limited
    expect(contextService.canProceedWithRequest(userId)).toBe(false);

    // Should return time until reset
    const remainingTime = contextService.getTimeUntilReset(userId);
    expect(remainingTime).toBeGreaterThan(0);
  });
});
