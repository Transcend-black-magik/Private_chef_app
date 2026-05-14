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
    return toSafeUserErrorMessage(error.message, fallback);
  }

  if (typeof error === "string") {
    return toSafeUserErrorMessage(error, fallback);
  }

  return fallback;
}

export function toSafeUserErrorMessage(message: string, fallback = "Something went wrong. Please try again.") {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    return fallback;
  }

  const normalizedMessage = trimmedMessage.toLowerCase();

  if (
    normalizedMessage.includes("network request failed") ||
    normalizedMessage.includes("client is offline") ||
    normalizedMessage.includes("failed to fetch") ||
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("failed to get document because the client is offline") ||
    normalizedMessage.includes("unavailable") ||
    normalizedMessage.includes("timeout") ||
    normalizedMessage.includes("timed out")
  ) {
    return "Your connection looks unstable right now. Please check your internet and try again.";
  }

  if (
    normalizedMessage.includes("permission-denied") ||
    normalizedMessage.includes("row-level security") ||
    normalizedMessage.includes("new row violates row-level security") ||
    normalizedMessage.includes("missing or insufficient permissions") ||
    normalizedMessage.includes("jwt") ||
    normalizedMessage.includes("invalid api key") ||
    normalizedMessage.includes("service role") ||
    normalizedMessage.includes("supabase") ||
    normalizedMessage.includes("firebase") ||
    normalizedMessage.includes("postgres") ||
    normalizedMessage.includes("violates foreign key") ||
    normalizedMessage.includes("violates check constraint") ||
    normalizedMessage.includes("duplicate key value")
  ) {
    return "We could not complete that action securely right now. Please try again, or contact support if it keeps happening.";
  }

  if (
    normalizedMessage.includes("openai") ||
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("edge function") ||
    normalizedMessage.includes("function returned") ||
    normalizedMessage.includes("internal server error")
  ) {
    return "That service is temporarily unavailable. Please try again in a moment.";
  }

  return trimmedMessage;
}
