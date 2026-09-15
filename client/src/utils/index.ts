type Debounced<A extends unknown[]> = {
  (...args: A): void;
  flush: () => void;
  cancel: () => void;
};

export const debounce = <A extends unknown[]>(
  fn: (...args: A) => void,
  delay: number,
): Debounced<A> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: A | undefined;

  const invoke = () => {
    if (pending) {
      const args = pending;
      pending = undefined;
      fn(...args);
    }
  };

  const debounced = (...args: A) => {
    pending = args;
    clearTimeout(timer);
    timer = setTimeout(invoke, delay);
  };

  debounced.flush = () => {
    clearTimeout(timer);
    invoke();
  };

  debounced.cancel = () => {
    clearTimeout(timer);
    pending = undefined;
  };

  return debounced;
};

export const getLocalStorage = (key: string, fallback = ''): string => {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
};

export const setLocalStorage = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    return;
  }
};