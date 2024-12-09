import { sdkBuilder, SdkBuilderConfig, RedisCacheProvider, CacheProvider } from '@nuecms/sdk-builder';

interface WeChatSDKConfig {
  appId: string;
  appSecret: string;
  baseUrl?: string;
  cacheProvider: CacheProvider;
  customResponseTransformer?: (response: any) => any;
  authCheckStatus?: (status: number, response: any) => boolean;
}

export {
  RedisCacheProvider,
  type CacheProvider,
  type WeChatSDKConfig,
}

export type WeChatSDK = ReturnType<typeof sdkBuilder>


export function wxSdk(config: WeChatSDKConfig): WeChatSDK {
  const sdkConfig: SdkBuilderConfig = {
    baseUrl: config.baseUrl || 'https://api.weixin.qq.com',
    cacheProvider: config.cacheProvider,
    placeholders: {
      access_token: '{access_token}',
    },
    config: {
      appId: config.appId,
      appSecret: config.appSecret,
    },
    customResponseTransformer: config.customResponseTransformer || ((response: any) => {
      if (response.errcode != 0) {
        throw new Error(`WeChat API Error: ${response.errmsg}`);
      }
      return response;
    }),
    authCheckStatus: config.authCheckStatus || ((status, response) => {
      return status === 401 || ((response as any)?.errcode === 40001);
    })
  };

  const sdk: WeChatSDK = sdkBuilder(sdkConfig);


  // # Access Token Management
  sdk.r('getAccessToken', '/cgi-bin/token', 'GET');


  // **OpenAPI Management**
  sdk.r('clearQuota', '/cgi-bin/clear_quota', 'POST', { isEncrypted: true });
  sdk.r('getApiQuota', '/cgi-bin/openapi/quota/get', 'POST', { isEncrypted: true });
  sdk.r('getRidInfo', '/cgi-bin/openapi/rid/get', 'POST', { isEncrypted: true });
  sdk.r('clearQuotaByAppSecret', '/cgi-bin/clear_quota/v2', 'POST');

  // **Mini Program Login**
  sdk.r('code2Session', '/sns/jscode2session', 'GET');
  sdk.r('checkSessionKey', '/cgi-bin/mmbiz/checksessionkey', 'POST');
  sdk.r('resetUserSessionKey', '/cgi-bin/mmbiz/resetsessionkey', 'POST');

  // **User Information**
  sdk.r('getPluginOpenPId', '/wxa/getpluginopenpid', 'POST', { isEncrypted: true });
  sdk.r('checkEncryptedData', '/cgi-bin/mmbiz/checkencrypteddata', 'POST', { isEncrypted: true });
  sdk.r('getPaidUnionid', '/wxa/getpaidunionid', 'GET');

  // **Network**
  sdk.r('getUserEncryptKey', '/wxa/getuserencryptkey', 'POST', { isEncrypted: true });

  // **Phone Number**
  sdk.r('getPhoneNumber', '/wxa/business/getphonenumber', 'POST', { isEncrypted: true });

  // **Mini Program Codes**
  sdk.r('getQRCode', '/wxa/getwxacode', 'POST', { isEncrypted: true });
  sdk.r('getUnlimitedQRCode', '/wxa/getwxacodeunlimit', 'POST', { isEncrypted: true });
  sdk.r('createQRCode', '/cgi-bin/wxaapp/createwxaqrcode', 'POST', { isEncrypted: true });

  // **URL Scheme**
  sdk.r('queryScheme', '/wxa/queryscheme', 'POST');
  sdk.r('generateScheme', '/wxa/generatescheme', 'POST');
  sdk.r('generateNFCScheme', '/wxa/generatenfcscheme', 'POST');

  // **URL Link**
  sdk.r('generateUrlLink', '/wxa/generate_urllink', 'POST');
  sdk.r('queryUrlLink', '/wxa/query_urllink', 'POST');

  // **Short Link**
  sdk.r('generateShortLink', '/wxa/genwxashortlink', 'POST');

  // **Customer Service**
  sdk.r('getTempMedia', '/cgi-bin/media/get', 'GET');
  sdk.r('setTyping', '/cgi-bin/message/custom/typing', 'POST');
  sdk.r('uploadTempMedia', '/cgi-bin/media/upload', 'POST');
  sdk.r('sendCustomMessage', '/cgi-bin/message/custom/send', 'POST', { isEncrypted: true });

  // **Messaging**
  sdk.r('createActivityId', '/cgi-bin/message/wxopen/activityid/create', 'POST');
  sdk.r('setUpdatableMsg', '/cgi-bin/message/wxopen/updatablemsg/send', 'POST', { isEncrypted: true });

  // **Content Security**
  sdk.r('msgSecCheck', '/wxa/msg_sec_check', 'POST', { isEncrypted: true });
  sdk.r('mediaCheckAsync', '/wxa/media_check_async', 'POST', { isEncrypted: true });

  // **Data Analysis**
  sdk.r('getDailySummary', '/datacube/getweanalysisappiddailysummarytrend', 'POST', { isEncrypted: true });
  sdk.r('getVisitPage', '/datacube/getweanalysisappidvisitpage', 'POST', { isEncrypted: true });
  sdk.r('getUserPortrait', '/datacube/getweanalysisappiduserportrait', 'POST', { isEncrypted: true });
  sdk.r('getPerformanceData', '/wxaapi/log/getperformance', 'POST', { isEncrypted: true });
  sdk.r('getVisitDistribution', '/datacube/getweanalysisappidvisitdistribution', 'POST', { isEncrypted: true });


  // **Livestream Management**
  sdk.r('createRoom', '/wxaapi/broadcast/room/create', 'POST');
  sdk.r('getLiveInfo', '/wxa/business/getliveinfo', 'POST');
  sdk.r('deleteRoom', '/wxaapi/broadcast/room/deleteroom', 'POST');

  // **Shopping Orders**
  sdk.r('uploadShoppingInfo', '/mall/importorder', 'POST');
  sdk.r('uploadCombinedShoppingInfo', '/mall/importcombinedorder', 'POST');
  sdk.r('verifyUploadResult', '/mall/verifyuploadinfo', 'POST');

  // **Plugin Management**
  sdk.r('managePluginApplication', '/wxa/plugin', 'POST', { isEncrypted: true });
  sdk.r('managePlugin', '/wxa/devplugin', 'POST', { isEncrypted: true });


  // **Cloud Development**
  sdk.r('sendCloudBaseSms', '/cloudbase/sendSms', 'POST');
  sdk.r('invokeCloudFunction', '/tcb/invokecloudfunction', 'POST');

  // **Nearby Mini Programs**
  sdk.r('addNearbyPoi', '/wxa/addnearbypoi', 'POST');
  sdk.r('deleteNearbyPoi', '/wxa/delnearbypoi', 'POST');
  sdk.r('getNearbyPoiList', '/wxa/getnearbypoilist', 'POST');

  // **OCR**
  sdk.r('printedTextOCR', '/cv/ocr/comm', 'POST');
  sdk.r('vehicleLicenseOCR', '/cv/ocr/drivinglicense', 'POST');
  sdk.r('bankCardOCR', '/cv/ocr/bankcard', 'POST');





  // Register the auth method
  sdk.rx('authenticate', async (config) => {
    const appId = config.appId;
    const appSecret = config.appSecret
    const cacheKey = `wechat_access_token_${appId}`;
    const cached = await sdk.cacheProvider?.get(cacheKey);
    if (cached.value) {
      sdk.enhanceConfig({ access_token: cached?.value?.access_token });
      return cached.value;
    }
    const response = await sdk.getAccessToken({ appid: appId, secret: appSecret, grant_type: 'client_credential' });
    // const accessToken = response.access_token;
    const expiresIn = response.expires_in || 7200;
    await sdk.cacheProvider?.set(cacheKey, response, 'json', expiresIn);
    sdk.enhanceConfig({ access_token: response.access_token });
    return {
      access_token: response.access_token,
    };
  })
  sdk.authenticate()
  return sdk;
}

