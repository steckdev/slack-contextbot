interface UserContext {
  currentContext: string;
  history: string[];
}

export class ContextService {
  private userContext: { [key: string]: UserContext } = {};

  saveContext(userId: string, newContext: string): void {
    const existingContext = this.userContext[userId];

    if (existingContext) {
      existingContext.history.push(existingContext.currentContext);
      existingContext.currentContext = newContext;
    } else {
      this.userContext[userId] = {
        currentContext: newContext,
        history: [],
      };
    }
  }

  getContext(userId: string): string | null {
    return this.userContext[userId]?.currentContext || null;
  }

  getHistory(userId: string): string[] {
    return this.userContext[userId]?.history || [];
  }

  addToHistory(userId: string, context: string): void {
    if (this.userContext[userId]) {
      this.userContext[userId].history.push(context);
    } else {
      this.userContext[userId] = {
        currentContext: '',
        history: [context],
      };
    }
  }

  clearHistory(userId: string): void {
    if (this.userContext[userId]) {
      this.userContext[userId].history = [];
    }
  }

  replaceContext(userId: string, newContext: string): void {
    if (this.userContext[userId]) {
      this.userContext[userId].currentContext = newContext;
    } else {
      this.userContext[userId] = {
        currentContext: newContext,
        history: [],
      };
    }
  }
}
