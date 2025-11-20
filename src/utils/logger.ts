const isDev = import.meta.env.DEV;

export const logger = {
  warn: (...args: unknown[]) => {
    if (isDev) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isDev) {
      console.error(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]) => {
    if (isDev) {
      console.debug(...args);
    }
  },
};
