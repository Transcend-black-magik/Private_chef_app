const DEFAULT_TIMEOUT_MS = 15000;

export async function withTimeout<T>(
  task: Promise<T>,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    timeoutMessage = "This request is taking too long. Please try again.",
  }: {
    timeoutMs?: number;
    timeoutMessage?: string;
  } = {},
) {
  return await new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    task.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function getAsyncErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) {
    const message = error.message.trim();

    if (!message) {
      return fallback;
    }

    const normalizedMessage = message.toLowerCase();

    if (
      normalizedMessage.includes("network request failed") ||
      normalizedMessage.includes("client is offline") ||
      normalizedMessage.includes("failed to get document because the client is offline") ||
      normalizedMessage.includes("unavailable")
    ) {
      return "Your connection looks unstable right now. Please check your internet and try again.";
    }

    if (
      normalizedMessage.includes("permission-denied") ||
      normalizedMessage.includes("missing or insufficient permissions")
    ) {
      return "This action is blocked by Firebase permissions right now.";
    }

    return message;
  }

  return fallback;
}
