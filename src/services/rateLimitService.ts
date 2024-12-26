interface UserRequestCounts {
  count: number;
  resetTime: number;
}

export class RateLimitService {
  private userRequestCounts: { [key: string]: UserRequestCounts } = {};

  private static readonly RATE_LIMIT = 100;

  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;

  canProceedWithRequest(userId: string): boolean {
    const currentTime = Date.now();
    const userCountInfo = this.userRequestCounts[userId];

    if (!userCountInfo) {
      this.userRequestCounts[userId] = {
        count: 0,
        resetTime: currentTime + RateLimitService.RATE_LIMIT_WINDOW_MS,
      };
      return true;
    }

    if (userCountInfo.count >= RateLimitService.RATE_LIMIT) {
      if (currentTime < userCountInfo.resetTime) {
        return false;
      }
      userCountInfo.count = 0;
      userCountInfo.resetTime = currentTime + RateLimitService.RATE_LIMIT_WINDOW_MS;
      return true;
    }

    userCountInfo.count += 1;
    return true;
  }

  getTimeUntilReset(userId: string): number {
    const currentTime = Date.now();
    const userCountInfo = this.userRequestCounts[userId];
    return userCountInfo ? Math.ceil((userCountInfo.resetTime - currentTime) / 60000) : 0;
  }
}
