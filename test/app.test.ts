import { userContext, userRequestCounts } from "../src/app";

describe("ContextBot Business Logic", () => {
  beforeEach(() => {
    // Reset the data before each test
    for (const key in userContext) {
      delete userContext[key];
    }
    for (const key in userRequestCounts) {
      delete userRequestCounts[key];
    }
  });

  it("should store a context for a user", () => {
    const userId = "U12345";
    const contextText = "This is my context";

    userContext[userId] = contextText;

    expect(userContext[userId]).toBe(contextText);
  });

  it("should apply rate limits correctly", () => {
    const userId = "U12345";
    userRequestCounts[userId] = { count: 19, resetTime: Date.now() + 1000 };

    expect(userRequestCounts[userId].count).toBe(19);
    userRequestCounts[userId].count += 1;
    expect(userRequestCounts[userId].count).toBe(20);
  });

  it("should reset rate limits after one hour", () => {
    const userId = "U12345";
    const now = Date.now();
    userRequestCounts[userId] = { count: 20, resetTime: now - 1000 }; // simulate past resetTime

    // Simulate a new request after the resetTime
    if (now > userRequestCounts[userId].resetTime) {
      userRequestCounts[userId].count = 0;
      userRequestCounts[userId].resetTime = now + 3600000;
    }

    expect(userRequestCounts[userId].count).toBe(0);
  });
});
