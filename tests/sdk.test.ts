import { describe, it, expect, beforeAll, vi } from 'vitest';
import { wxSdk } from '../src';
import { RedisCacheProvider } from '@nuecms/sdk-builder';
import Redis from 'ioredis';



describe('WeChat SDK Tests', () => {
  const mockConfig = {
    appId: process.env.WECHAT_APP_ID || 'mockAppId',
    appSecret: process.env.WECHAT_APP_SECRET || 'mockApp',
    cacheProvider: new RedisCacheProvider(new Redis()),
  };

  let sdk: ReturnType<typeof wxSdk>;

  beforeAll(() => {
    sdk = wxSdk(mockConfig);
    // Mock API Response for getAccessToken
    const mockAccessTokenResponse = {
      access_token: 'mockAccessToken123',
      expires_in: 7200,
    };

    // Mock HTTP request
    vi.spyOn(sdk, 'getAccessToken').mockResolvedValue(mockAccessTokenResponse);
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
    const cachedToken = await mockConfig.cacheProvider.get(`wechat_access_token_${mockConfig.appId}`);
    expect(cachedToken).toBeDefined();
    expect(JSON.parse(cachedToken || '').access_token).toBe('mockAccessToken123');
  });

  it('should call a user info endpoint', async () => {
    const mockUserInfoResponse = {
      openid: 'testOpenId',
      nickname: 'Test User',
      gender: 1,
      city: 'Shanghai',
    };

    vi.spyOn(sdk, 'getUserInfo').mockResolvedValue(mockUserInfoResponse);

    const response = await sdk.getUserInfo({ openid: 'testOpenId' });
    expect(response.openid).toBe('testOpenId');
    expect(response.nickname).toBe('Test User');
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
