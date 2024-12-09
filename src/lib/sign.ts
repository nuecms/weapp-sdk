
import crypto from 'crypto'

// The context for encrypt and decrypt
type EncryptCtx = {
  symKey: string; // 对称密钥
  symSn: string; // 对称密钥编号
  privateSn: string; // 私钥编号
  privateKey: string; // 私钥
  certificate: string; // 开放平台证书
  appId: string; // 小程序appid
  url: string; // 请求的url
}

type ReqBody = Record<string, any>

// The response body from the server
type RespBody = {
  resp_appid: string;
  resp_ts: number;
  resp_sn: string;
  resp_sig: string;
  resp_deprecated_sn: string;
  resp_deprecated_sig: string;
  resp_data: string;
}

/**
 * encrypt the request data
 * @param ctx
 * @param req
 * @returns
 */
export function encrypt(ctx: EncryptCtx, req: ReqBody) {
  const { symKey, symSn, appId, url } = ctx // 开发者本地信息
  const local_ts = Math.floor(Date.now() / 1000) //加密签名使用的统一时间戳
  const nonce = crypto.randomBytes(16).toString('base64').replace(/=/g, '')
  const reqex = {
    _n: nonce,
    _appid: appId,
    _timestamp: local_ts
  }
  const real_req = Object.assign({}, reqex, req) // 生成并添加安全校验字段
  const plaintext = JSON.stringify(real_req)
  const aad = `${url}|${appId}|${local_ts}|${symSn}`
  const real_key = Buffer.from(symKey, "base64")
  const real_iv = crypto.randomBytes(12)
  const real_aad = Buffer.from(aad, "utf-8")
  const real_plaintext = Buffer.from(plaintext, "utf-8")

  const cipher = crypto.createCipheriv("aes-256-gcm", real_key, real_iv)
  cipher.setAAD(real_aad)

  let cipher_update = cipher.update(real_plaintext)
  let cipher_final = cipher.final()
  const real_ciphertext = Buffer.concat([cipher_update, cipher_final])
  const real_authTag = cipher.getAuthTag()

  const iv = real_iv.toString("base64")
  const data = real_ciphertext.toString("base64")
  const authtag = real_authTag.toString("base64")

  const req_data = {
    iv,
    data,
    authtag,
  }
  const new_req = {
    req_ts: local_ts,
    req_data: JSON.stringify(req_data)
  }
  return new_req
}

/**
 * encrypt and signature the request data
 * @param ctx
 * @param options
 * @returns options with encrypted and signature
 */
export function encryptAndSignature(ctx: EncryptCtx, options: any) {
  const body = options.body
  const req = encrypt(ctx, body)
  const signature = getSignature(ctx, req)
  const headers = {
    ...options.headers,
    "Wechatmp-Appid": ctx.appId,
    "Wechatmp-TimeStamp": req.req_ts,
    "Wechatmp-Signature": signature,
  }
  return {
    ...options,
    body: req,
    headers,
  }
}


export function getSignature(ctx: EncryptCtx, req: ReqBody) {
  const { privateKey, privateSn, appId, url } = ctx // 开发者本地信息
  const { req_ts, req_data } = req // 待请求API数据
  const payload = `${url}\n${appId}\n${req_ts}\n${req_data}`
  const data_buffer = Buffer.from(payload, 'utf-8')
  const key_obj = {
    key: privateKey,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST // salt长度，需与SHA256结果长度(32)一致
  }

  const sig_buffer = crypto.sign(
    'RSA-SHA256',
    data_buffer,
    key_obj
  )
  const sig = sig_buffer.toString('base64')
  return sig
}

/***
 * check the signature of the response data
 * @param ctx
 * @param resp
 * @returns boolean
 */
export function checkSignature(ctx: EncryptCtx, resp: RespBody): boolean {
  const { certificate, privateSn, appId, url } = ctx // 开发者本地信息
  const { resp_appid, resp_ts, resp_sn, resp_sig, resp_deprecated_sn, resp_deprecated_sig, resp_data } = resp // API响应数据，包括响应头与响应数据

  const local_ts = Math.floor(Date.now() / 1000)
  // 安全检查，根据业务实际需求判断
  if (appId != resp_appid || // 回包appid不正确
    local_ts - resp_ts > 300) { // 回包时间超过5分钟
    console.error("安全字段校验失败")
    return false
  }

  let signature = ''
  if (privateSn === resp_sn) {
    signature = resp_sig
  } else if (privateSn === resp_deprecated_sn) { // 本地证书编号与即将过期编号一致，需及时更换
    console.warn("平台证书即将过期，请及时更换")
    signature = resp_deprecated_sig
  } else {
    console.error("sn不匹配")
    return false
  }

  const payload = `${url}\n${resp_appid}\n${resp_ts}\n${resp_data}`
  const data_buffer = Buffer.from(payload, 'utf-8')
  const sig_buffer = Buffer.from(signature, 'base64')
  const key_obj = {
    key: certificate,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: crypto.constants.RSA_PSS_SALTLEN_DIGEST
  }

  const result = crypto.verify(
    'RSA-SHA256',
    data_buffer,
    key_obj,
    sig_buffer
  )
  return result
}

/**
 *  decrypt the response data
 * @param ctx
 * @param resp
 * @returns any
 */
export function decrypt(ctx: EncryptCtx, resp: RespBody): any {
  const { symKey, symSn, appId, url } = ctx // 开发者本地信息
  const { resp_ts, resp_data } = resp // API响应数据，解密只需要响应头时间戳与响应数据
  const { iv, data, authtag } = JSON.parse(resp_data)
  const aad = `${url}|${appId}|${resp_ts}|${symSn}`
  const real_aad = Buffer.from(aad, "utf-8")
  const real_key = Buffer.from(symKey, "base64")
  const real_iv = Buffer.from(iv, "base64")
  const real_data = Buffer.from(data, "base64")
  const real_authtag = Buffer.from(authtag, "base64")
  const decipher = crypto.createDecipheriv("aes-256-gcm", real_key, real_iv)
  decipher.setAAD(real_aad)
  decipher.setAuthTag(real_authtag)
  let decipher_update = decipher.update(real_data)
  let decipher_final
  try {
    decipher_final = decipher.final()
  } catch (error) {
    console.error("auth tag验证失败")
    return {
      errcode: -1,
      errmsg: "auth tag验证失败"
    }
  }
  const real_deciphertext = Buffer.concat([decipher_update, decipher_final])
  const deciphertext = real_deciphertext.toString("utf-8")
  const real_resp = JSON.parse(deciphertext)
  const local_ts = Math.floor(Date.now() / 1000)
  if (
    // 安全检查，根据业务实际需求判断
    real_resp["_appid"] != appId || // appid不匹配
    real_resp["_timestamp"] != resp_ts || // timestamp与Wechatmp-TimeStamp不匹配
    local_ts - real_resp["_timestamp"] > 300 // 响应数据的时候与当前时间超过5分钟
  ) {
    console.error("安全字段校验失败")
    return {
      errcode: -1,
      errmsg: "安全字段校验失败"
    }
  }
  return real_resp
}

/**
 * check and decrypt the response data
 * @param ctx
 * @param resp
 * @returns
 */
export function checkAndDecrypt(ctx: EncryptCtx, resp: RespBody): any {
  if (!checkSignature(ctx, resp)) {
    return {
      errcode: -1,
      errmsg: '签名验证失败'
    }
  }
  return decrypt(ctx, resp)
}
