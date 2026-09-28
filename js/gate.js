const DESKTOP_WECHAT = /WindowsWechat|MacWechat|UnifiedPCWindowsWechat|UnifiedPCMacWechat|WindowsWeixin|MacWeixin/i;
const WINDOWS = /Windows NT|Win64|Win32|WOW64/i;
const MOBILE_DEVICE = /iPhone|iPad|iPod|Android|HarmonyOS|OpenHarmony|Mobile/i;

export function classifyAccess(userAgent) {
  const ua = String(userAgent || "");
  const inWeChat = /MicroMessenger/i.test(ua);
  const macDesktop = /Macintosh/i.test(ua) && !/iPhone|iPad|iPod/i.test(ua);
  const desktop = DESKTOP_WECHAT.test(ua) || WINDOWS.test(ua) || macDesktop;
  const mobile = MOBILE_DEVICE.test(ua);

  if (!inWeChat || desktop || !mobile) {
    return "not-mobile-wechat";
  }
  return "allow";
}

export function parseCloudflareLoc(traceText) {
  const match = String(traceText || "").match(/^loc=([A-Za-z]{2})\s*$/m);
  return match ? match[1].toUpperCase() : null;
}

export async function lookupCountry(fetchImpl = globalThis.fetch) {
  const response = await fetchImpl("https://www.cloudflare.com/cdn-cgi/trace", {
    cache: "no-store",
    credentials: "omit",
  });
  if (!response.ok) {
    throw new Error("trace unavailable");
  }
  const loc = parseCloudflareLoc(await response.text());
  if (!loc) {
    throw new Error("missing loc");
  }
  return loc;
}
