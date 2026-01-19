import Logger from '@youpaichris/logger';

const createInstance = (scope?: string): Logger => {
  const instance = new Logger(false, scope ?? undefined);
  if (scope) {
    instance.setPrefix(`[${scope}]`);
  }
  return instance;
};

export const appLogger = createInstance('polymarket-arb');

export const createLogger = (scope: string): Logger => createInstance(scope);
