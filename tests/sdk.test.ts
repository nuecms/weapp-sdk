import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { wxSdk } from '../src';
import { RedisCacheProvider } from '@nuecms/sdk-builder';
import Redis from 'ioredis';



describe('WeChat Mini Program SDK Tests', () => {
  const mockConfig = {
    appId: process.env.VITE_APP_APPID || 'mockAppId',
    appSecret: process.env.VITE_APP_APPSECRET || 'mockApp',
    cacheProvider: new RedisCacheProvider(new Redis()),
  };

  let sdk: ReturnType<typeof wxSdk>;

  beforeEach(() => {
    sdk = wxSdk(mockConfig);
    // Mock API Response for getAccessToken
    const mockAccessTokenResponse = {
      access_token: 'mockAccessToken123',
      expires_in: 7200,
    };

    // Mock HTTP request
    vi.spyOn(sdk, 'getAccessToken').mockResolvedValue(mockAccessTokenResponse);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize SDK correctly', () => {
    expect(sdk).toBeDefined();
    expect(typeof sdk.r).toBe('function');
  });

  it('should get an access token', async () => {
    const response = await sdk.getAccessToken({
      appid: mockConfig.appId,
      secret: mockConfig.appSecret,
      grant_type: 'client_credential',
    });
    expect(response.access_token).toBe('mockAccessToken123');
    expect(response.expires_in).toBe(7200);
  });

  it('should cache the access token', async () => {
    vi.spyOn(mockConfig.cacheProvider, 'get').mockResolvedValue({
      value: {
        access_token: 'mockAccessToken123',
      }
    })
    const cachedToken = await mockConfig.cacheProvider.get(`wechat_access_token_${mockConfig.appId}`);
    expect(cachedToken.value).toBeDefined();
    expect(cachedToken.value.access_token).toBe('mockAccessToken123');
  });

  it('should call a generate_urllink endpoint', async () => {
    // mock generateShortLink response
    const mockGenerateShortLinkResponse = {
      "errcode": 0,
      "errmsg": "ok",
      link: 'https://short.link/mock',
    };

    vi.spyOn(sdk, 'generateShortLink').mockResolvedValue(mockGenerateShortLinkResponse);

    const response = await sdk.generateShortLink({
      "page_url": "pages/publishHomework/publishHomework?query1=q1",
      "page_title": "Homework title",
      "is_permanent":false
    });
    expect(response.link).toBe('https://short.link/mock');
    expect(response.errcode).toBe(0);
    expect(response.errmsg).toBe('ok');
  });

  it('should handle errors gracefully', async () => {
    const errorMessage = 'Invalid AppID or Secret';

    vi.spyOn(sdk, 'getAccessToken').mockRejectedValue(new Error(errorMessage));

    try {
      await sdk.getAccessToken({
        appid: 'invalidAppId',
        secret: 'invalidAppSecret',
        grant_type: 'client_credential',
      });
    } catch (error) {
      expect((error as Error).message).toBe(errorMessage);
    }
  });
});
