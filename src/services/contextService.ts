interface UserContext {
  [key: string]: string;
}

interface UserRequestCounts {
  count: number;
  resetTime: number;
}

export class ContextService {
  private userContext: UserContext = {};
  private userRequestCounts: { [key: string]: UserRequestCounts } = {};

  private static readonly RATE_LIMIT = 20;
  private static readonly RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

  saveContext(userId: string, context: string): void {
    this.userContext[userId] = context;
    this.userRequestCounts[userId] = {
      count: 0,
      resetTime: Date.now() + ContextService.RATE_LIMIT_WINDOW_MS,
    };
  }

  getContext(userId: string): string | null {
    return this.userContext[userId] || null;
  }

  canProceedWithRequest(userId: string): boolean {
    const currentTime = Date.now();
    const userCountInfo = this.userRequestCounts[userId];

    if (!userCountInfo) {
      this.userRequestCounts[userId] = {
        count: 0,
        resetTime: currentTime + ContextService.RATE_LIMIT_WINDOW_MS,
      };
      return true;
    }

    if (userCountInfo.count >= ContextService.RATE_LIMIT) {
      if (currentTime < userCountInfo.resetTime) {
        return false;
      } else {
        userCountInfo.count = 0;
        userCountInfo.resetTime =
          currentTime + ContextService.RATE_LIMIT_WINDOW_MS;
        return true;
      }
    }

    userCountInfo.count += 1;
    return true;
  }

  getTimeUntilReset(userId: string): number {
    const currentTime = Date.now();
    const userCountInfo = this.userRequestCounts[userId];
    return userCountInfo
      ? Math.ceil((userCountInfo.resetTime - currentTime) / 60000)
      : 0;
  }
}
