import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { wxSdk, RedisCacheProvider } from '../src/index';
import Redis from 'ioredis';

describe('WeChat SDK Tests', () => {
  let sdk: ReturnType<typeof wxSdk>;

  beforeAll(async () => {
    sdk = wxSdk({
      appId: process.env.VITE_APP_APPID || 'mockAppId',
      appSecret: process.env.VITE_APP_APPSECRET || 'mockApp',
      cacheProvider: new RedisCacheProvider(new Redis()),
    });
    await sdk.authenticate()
  })

  afterAll(() => {
    vi.restoreAllMocks();
  })

  it('should create a QR code', async () => {
    const response = await sdk.createQRCode({ path: 'pages/index/index', width: 430 });
    // response to be Blob type
    expect(response).toBeInstanceOf(Blob);
  });

  it('should get a QR code', async () => {
    const response = await sdk.getQRCode({ path: 'pages/index/index', width: 430 });
    expect(response).toBeInstanceOf(Blob);
  });

  it('should get an unlimited QR code', async () => {
    const response = await sdk.getUnlimitedQRCode({ scene: 'id=1234', width: 430 });
    expect(response).toBeInstanceOf(Blob);
  });

  it('should generate a short link', async () => {
    const response = await sdk.generateShortLink({ page_url: "pages/publishHomework/publishHomework?query1=q1",  "page_title": "Homework title",  is_permanent: true });
    // response errmsg contain "this appid does not have permission rid" error
    // need the permission to generate short link
    // https://developers.weixin.qq.com/miniprogram/dev/OpenApiDoc/qrcode-link/short-link/generateShortLink.html
    expect(response).toHaveProperty('errmsg');
    // errorcode not equal to 0
    expect(response.errcode).not.toBe(0);
  });
});
