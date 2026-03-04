export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  border: string;
  accent: string;
}

export interface UIConfig {
  themes: {
    light: ThemeColors;
    dark: ThemeColors;
    system: ThemeColors;
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  fonts: {
    heading: string;
    body: string;
    monospace: string;
  };
  spacing: {
    small: string;
    medium: string;
    large: string;
    extraLarge: string;
  };
  borderRadius: {
    small: string;
    medium: string;
    large: string;
    extraLarge: string;
  };
}

export interface ChatUIProps {
  messages: { id: string; role: 'user' | 'expert'; content: string }[];
  isChatOpen: boolean;
  toggleChat: () => void;
}

export interface ExpertChatProps {
  expert: {
    id: string;
    name: string;
    title: string;
    specialization: string;
    expertiseLevel: 'principal' | 'advanced' | 'intermediate';
  };
}