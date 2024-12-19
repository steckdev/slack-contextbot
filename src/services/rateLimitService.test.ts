import { RateLimitService } from "../../src/services/rateLimitService";

describe("RateLimitService", () => {
  let rateLimitService: RateLimitService;

  beforeEach(() => {
    rateLimitService = new RateLimitService();
  });

  it("should allow requests under the rate limit", () => {
    const userId = "U12345";

    expect(rateLimitService.canProceedWithRequest(userId)).toBe(true);

    for (let i = 0; i < 99; i++) {
      expect(rateLimitService.canProceedWithRequest(userId)).toBe(true);
    }

    expect(rateLimitService.canProceedWithRequest(userId)).toBe(true);
  });

  it("should rate limit after 101 requests", () => {
    const userId = "U12345";

    for (let i = 0; i < 101; i++) {
      rateLimitService.canProceedWithRequest(userId);
    }

    expect(rateLimitService.canProceedWithRequest(userId)).toBe(false);
  });

  it("should return time until reset", () => {
    const userId = "U12345";
    rateLimitService.canProceedWithRequest(userId);

    const timeUntilReset = rateLimitService.getTimeUntilReset(userId);
    expect(timeUntilReset).toBeGreaterThan(0);
  });
});
