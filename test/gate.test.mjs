import assert from "node:assert/strict";
import test from "node:test";
import { classifyAccess, parseCloudflareLoc } from "../js/gate.js";

const iphoneWeChat =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 MicroMessenger/8.0.42(0x18002a2d) NetType/WIFI Language/zh_CN";
const androidWeChat =
  "Mozilla/5.0 (Linux; Android 12; Pixel 6) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/120.0.0.0 Mobile Safari/537.36 MicroMessenger/8.0.42.2460 WeChat/arm64 Language/zh_CN";
const windowsWeChat =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 MicroMessenger/7.0.20.1781 NetType/WIFI MiniProgramEnv/Windows WindowsWechat/WMPF";
const macWeChat =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) MicroMessenger/6.8.0 MacWechat/3.8.5 Safari/605.1.15";

test("allows phone WeChat", () => {
  assert.equal(classifyAccess(iphoneWeChat), "allow");
  assert.equal(classifyAccess(androidWeChat), "allow");
});

test("blocks desktop browsers, mobile browsers, and desktop WeChat", () => {
  assert.equal(classifyAccess("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0"), "not-mobile-wechat");
  assert.equal(classifyAccess("Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) Mobile/15E148"), "not-mobile-wechat");
  assert.equal(classifyAccess(windowsWeChat), "not-mobile-wechat");
  assert.equal(classifyAccess(macWeChat), "not-mobile-wechat");
});

test("reads Cloudflare loc and nothing else", () => {
  const trace = "fl=abc\nip=1.2.3.4\nloc=HK\ncolo=HKG\n";
  assert.equal(parseCloudflareLoc(trace), "HK");
  assert.equal(parseCloudflareLoc("loc=us\n"), "US");
  assert.equal(parseCloudflareLoc("colo=HK\n"), null);
  assert.equal(parseCloudflareLoc(""), null);
});
