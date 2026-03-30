import type { ClientTimeInput } from "@/lib/clientTime";

const resolveBrowserTimeZone = (): string | undefined => {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone?.trim();
  return timeZone ? timeZone : undefined;
};

export const getBrowserTimeInput = (): ClientTimeInput => {
  const clientTimeZone = resolveBrowserTimeZone();

  return {
    clientTimezoneOffsetMinutes: new Date().getTimezoneOffset(),
    ...(clientTimeZone ? { clientTimeZone } : {}),
  };
};

export const createBrowserTimeSearchParams = (
  initialValues: Record<string, string | undefined> = {}
) => {
  const params = new URLSearchParams();

  Object.entries(initialValues).forEach(([key, value]) => {
    if (value !== undefined) {
      params.set(key, value);
    }
  });

  const { clientTimezoneOffsetMinutes, clientTimeZone } = getBrowserTimeInput();
  params.set(
    "clientTimezoneOffsetMinutes",
    String(clientTimezoneOffsetMinutes)
  );

  if (clientTimeZone) {
    params.set("clientTimeZone", clientTimeZone);
  }

  return params;
};
