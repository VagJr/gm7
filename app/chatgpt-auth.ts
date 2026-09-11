import { headers } from "next/headers";
import { redirect } from "next/navigation";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
  isNewSession?: boolean;
  cookieHeaderValue?: string;
};

const USER_ID_HEADER = "oai-authenticated-user-id";
const USER_EMAIL_HEADER = "oai-authenticated-user-email";
const USER_FULL_NAME_HEADER = "oai-authenticated-user-full-name";
const USER_FULL_NAME_ENCODING_HEADER =
  "oai-authenticated-user-full-name-encoding";
const PERCENT_ENCODED_UTF8 = "percent-encoded-utf-8";
const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const requestHeaders = await headers();
  const userId = requestHeaders.get(USER_ID_HEADER);
  const email = requestHeaders.get(USER_EMAIL_HEADER);
  if (userId && email) {
    const encodedFullName = requestHeaders.get(USER_FULL_NAME_HEADER);
    const fullName =
      encodedFullName &&
      requestHeaders.get(USER_FULL_NAME_ENCODING_HEADER) === PERCENT_ENCODED_UTF8
        ? safeDecodeURIComponent(encodedFullName)
        : null;

    return {
      userId,
      displayName: fullName ?? email,
      email,
      fullName,
    };
  }

  // Server-generated anonymous session identity per browser/client via Cookie
  const rawCookie = requestHeaders.get("cookie") || "";
  const match = /lume_session_id=([^;]+)/.exec(rawCookie);

  if (match && match[1]?.trim()) {
    const sessionId = decodeURIComponent(match[1].trim());
    return {
      userId: sessionId,
      displayName: `Aventureiro ${sessionId.slice(-4).toUpperCase()}`,
      email: `${sessionId}@lume.local`,
      fullName: `Aventureiro ${sessionId.slice(-4).toUpperCase()}`,
      isNewSession: false
    };
  }

  // Legacy or test auth_session fallback
  const authMatch = /auth_session=([^;]+)/.exec(rawCookie);
  if (authMatch && authMatch[1]?.trim()) {
    try {
      const decoded = JSON.parse(Buffer.from(decodeURIComponent(authMatch[1].trim()), 'base64').toString('utf-8'));
      if (decoded?.userId) {
        return {
          userId: String(decoded.userId),
          displayName: String(decoded.displayName || 'Aventureiro'),
          email: `${decoded.userId}@lume.local`,
          fullName: String(decoded.displayName || 'Aventureiro'),
          isNewSession: false
        };
      }
    } catch {}
  }

  // Generate unique anonymous ID for this new browser session (Server Authoritative)
  const newId = `anon_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  return {
    userId: newId,
    displayName: `Aventureiro ${newId.slice(-4).toUpperCase()}`,
    email: `${newId}@lume.local`,
    fullName: `Aventureiro ${newId.slice(-4).toUpperCase()}`,
    isNewSession: true,
    cookieHeaderValue: `lume_session_id=${encodeURIComponent(newId)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`
  };
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}

function safeDecodeURIComponent(value: string): string | null {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
