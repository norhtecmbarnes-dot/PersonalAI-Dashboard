// Authenticated browser sessions have been removed to simplify the system
// and avoid Playwright dependency issues.

export interface AuthenticatedSession {
  name: string;
  url: string;
  createdAt: number;
  lastUsed: number;
}

interface SessionConfig {
  name: string;
  loginUrl: string;
  selectors?: {
    username?: string;
    password?: string;
    submit?: string;
    successIndicator?: string;
  };
}

class AuthenticatedBrowserService {
  async initialize(): Promise<void> {
    console.log('[AuthSession] Authenticated browser sessions disabled.');
  }

  async createSession(config: SessionConfig): Promise<AuthenticatedSession | null> {
    console.log('[AuthSession] Authenticated browser sessions disabled.');
    return null;
  }

  async useSession(name: string, task: (page: any) => Promise<void>): Promise<boolean> {
    console.log('[AuthSession] Authenticated browser sessions disabled.');
    return false;
  }

  async closeSession(name: string): Promise<void> {
    console.log('[AuthSession] Authenticated browser sessions disabled.');
  }

  async closeAll(): Promise<void> {
    console.log('[AuthSession] Authenticated browser sessions disabled.');
  }

  listSessions(): AuthenticatedSession[] {
    return [];
  }
}

export const authBrowserService = new AuthenticatedBrowserService();
