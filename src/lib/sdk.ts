import { sdkBuilder, SdkBuilderConfig, RedisCacheProvider, CacheProvider } from '@nuecms/sdk-builder';

import { encryptAndSignature, checkAndDecrypt } from './sign';



type Signature = {
  symKey: string; // 对称密钥
  symSn: string; // 对称密钥编号
  privateSn: string; // 私钥编号
  privateKey: string; // 私钥
  certificate: string; // 开放平台证书
}

type Endpoint = {
  path: string;
  method: string;
  isEncrypted?: boolean;
}

type WeChatSDKRequestInterceptorOptions = {
  name: string,
  endpoint: Endpoint,
  path: string,
  method: string,
  body: any,
  headers: any,
  params: any,
}

interface WeChatSDKConfig {
  appId: string;
  appSecret: string;
  signature?: false | Signature;
  baseUrl?: string;
  cacheProvider: CacheProvider;
  customResponseTransformer?: (response: any, options: any) => any;
  authCheckStatus?: (status: number, response: any) => boolean;
}

export {
  RedisCacheProvider,
  type CacheProvider,
  type WeChatSDKConfig,
}

export type WeChatSDK = ReturnType<typeof sdkBuilder>


const useResponseTransformer = (config: WeChatSDKConfig, cusotmTransformer: Function) => {
  return (response: any, options: any) => {
    let result = response;
    if (config.signature && options.endpoint.isEncrypted) {
      result = checkAndDecrypt({
        symKey: config.signature?.symKey || '',
        symSn: config.signature?.symSn || '',
        privateSn: config.signature?.privateSn || '',
        privateKey: config.signature?.privateKey || '',
        certificate: config.signature?.certificate || '',
        url: `${config.baseUrl}${options.path}`,
        appId: config.appId,
      }, response);
    }
    return cusotmTransformer(response);
  }
}


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
      signature: config.signature || false,
    },
    customResponseTransformer: useResponseTransformer(config, config.customResponseTransformer || ((response: any, options: any) => {
      return response;
    })),
    authCheckStatus: config.authCheckStatus || ((status, response) => {
      return status === 401 || ((response as any)?.errcode === 40001);
    })
  };

  const sdk: WeChatSDK = sdkBuilder(sdkConfig);


  // # Access Token Management
  sdk.r('getAccessToken', '/cgi-bin/token', 'GET');


  // **OpenAPI Management**
  sdk.z('clearQuota', { path: '/cgi-bin/clear_quota', method: 'POST', isEncrypted: true });
  sdk.z('getApiQuota', { path: '/cgi-bin/openapi/quota/get', method: 'POST', isEncrypted: true });
  sdk.z('getRidInfo', { path: '/cgi-bin/openapi/rid/get', method: 'POST', isEncrypted: true });
  sdk.r('clearQuotaByAppSecret', '/cgi-bin/clear_quota/v2', 'POST');

  // **Mini Program Login**
  sdk.r('code2Session', '/sns/jscode2session', 'GET');
  sdk.r('checkSessionKey', '/cgi-bin/mmbiz/checksessionkey', 'POST');
  sdk.r('resetUserSessionKey', '/cgi-bin/mmbiz/resetsessionkey', 'POST');

  // **User Information**
  sdk.z('getPluginOpenPId', { path: '/wxa/getpluginopenpid', method: 'POST', isEncrypted: true });
  sdk.z('checkEncryptedData', { path: '/cgi-bin/mmbiz/checkencrypteddata', method: 'POST', isEncrypted: true });
  sdk.r('getPaidUnionid', '/wxa/getpaidunionid', 'GET');

  // **Network**
  sdk.z('getUserEncryptKey', { path: '/wxa/getuserencryptkey', method: 'POST', isEncrypted: true });

  // **Phone Number**
  sdk.z('getPhoneNumber', { path: '/wxa/business/getphonenumber', method: 'POST', isEncrypted: true });

  // **Mini Program Codes**
  sdk.z('getQRCode', { path: '/wxa/getwxacode', method: 'POST', isEncrypted: true });
  sdk.z('getUnlimitedQRCode', { path: '/wxa/getwxacodeunlimit', method: 'POST', isEncrypted: true });
  sdk.z('createQRCode', { path: '/cgi-bin/wxaapp/createwxaqrcode', method: 'POST', isEncrypted: true });

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
  sdk.z('sendCustomMessage', { path: '/cgi-bin/message/custom/send', method: 'POST', isEncrypted: true });

  // **Messaging**
  sdk.r('createActivityId', '/cgi-bin/message/wxopen/activityid/create', 'POST');
  sdk.z('setUpdatableMsg', { path: '/cgi-bin/message/wxopen/updatablemsg/send', method: 'POST', isEncrypted: true });

  // **Content Security**
  sdk.z('msgSecCheck', { path: '/wxa/msg_sec_check', method: 'POST', isEncrypted: true });
  sdk.z('mediaCheckAsync', { path: '/wxa/media_check_async', method: 'POST', isEncrypted: true });

  // **Data Analysis**
  sdk.z('getDailySummary', { path: '/datacube/getweanalysisappiddailysummarytrend', method: 'POST', isEncrypted: true });
  sdk.z('getVisitPage', { path: '/datacube/getweanalysisappidvisitpage', method: 'POST', isEncrypted: true });
  sdk.z('getUserPortrait', { path: '/datacube/getweanalysisappiduserportrait', method: 'POST', isEncrypted: true });
  sdk.z('getPerformanceData', { path: '/wxaapi/log/getperformance', method: 'POST', isEncrypted: true });
  sdk.z('getVisitDistribution', { path: '/datacube/getweanalysisappidvisitdistribution', method: 'POST', isEncrypted: true });


  // **Livestream Management**
  sdk.r('createRoom', '/wxaapi/broadcast/room/create', 'POST');
  sdk.r('getLiveInfo', '/wxa/business/getliveinfo', 'POST');
  sdk.r('deleteRoom', '/wxaapi/broadcast/room/deleteroom', 'POST');

  // **Shopping Orders**
  sdk.r('uploadShoppingInfo', '/mall/importorder', 'POST');
  sdk.r('uploadCombinedShoppingInfo', '/mall/importcombinedorder', 'POST');
  sdk.r('verifyUploadResult', '/mall/verifyuploadinfo', 'POST');

  // **Plugin Management**
  sdk.z('managePluginApplication', { path: '/wxa/plugin', method: 'POST', isEncrypted: true });
  sdk.z('managePlugin', { path: '/wxa/devplugin', method: 'POST', isEncrypted: true });


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


  sdk.rx('reqInterceptor', async (config, params?: {}) => {
    const options = params as WeChatSDKRequestInterceptorOptions;
    if (options && config.signature && options.endpoint.isEncrypted) {
      return encryptAndSignature({
        ...config.signature,
        appId: config.appId,
        url: `${config.baseUrl}${options.path}`,
      }, options);
    }
    return options;
  });

  // Register the auth method
  sdk.rx('authenticate', async (config) => {
    const appId = config.appId;
    const appSecret = config.appSecret
    const cacheKey = `wechat_access_token_${appId}`;
    const cached = await sdk.cacheProvider?.get(cacheKey);
    if (cached?.value) {
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
  // await sdk.authenticate()
  return sdk;
}

