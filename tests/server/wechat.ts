import http, { IncomingMessage, ServerResponse } from 'http';
import crypto from 'crypto';
import { URL } from 'url';
import { wxSdk, RedisCacheProvider } from '../../src/lib/sdk';
import { Redis } from 'ioredis';
import { XMLParser } from 'fast-xml-parser'
const parser = new XMLParser();

// Helper function to compute SHA-1 hash
function sha1(str: string): string {
  return crypto.createHash('sha1').update(str).digest('hex');
}

// Token for validation (replace with your actual token)
const TOKEN: string = process.env.wx_token || 'abcdef';


const routes = {
  'POST /wechat': (req, res)=> {
      // console.log('wechat', req.url);
      // get xml data
      let xmlData = '';
      req.on('data', (chunk) => {
        xmlData += chunk.toString();
      });
      req.on('end', () => {
        // parse xml data to json
        const data = parser.parse(xmlData);
        // {
        //   xml: {
        //     ToUserName: 'gh_4ba382a52c15',
        //     FromUserName: 'o7mtY6cDZrKd-BJmwM1Lttmlw4P8',
        //     CreateTime: 1733629424,
        //     MsgType: 'event',
        //     Event: 'CLICK',
        //     EventKey: 'V1001_TODAY_MUSIC'
        //   }
        // }
        // if EventKey V1001_TODAY_MUSIC
        if (data.xml.EventKey === 'V1001_TODAY_MUSIC') {
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          const { ToUserName, FromUserName } = data.xml;
          // time length as 1733629424
          let time = Date.now();
          const rtime = ('' + time).slice(0, 10);
          res.end(`
            <xml>
              <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
              <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
              <CreateTime>${rtime}</CreateTime>
              <MsgType><![CDATA[text]]></MsgType>
              <Content><![CDATA[Today's music is: Despacito]]></Content>
            </xml>
          `);
          return;
        }
        // if EventKey V1001_GOOD
        if (data.xml.EventKey === 'V1001_GOOD') {
          res.writeHead(200, { 'Content-Type': 'text/xml' });
          const { ToUserName, FromUserName } = data.xml;
          // time length as 1733629424
          let time = Date.now();
          const rtime = ('' + time).slice(0, 10);
          res.end(`
            <xml>
              <ToUserName><![CDATA[${FromUserName}]]></ToUserName>
              <FromUserName><![CDATA[${ToUserName}]]></FromUserName>
              <CreateTime>${rtime}</CreateTime>
              <MsgType><![CDATA[text]]></MsgType>
              <Content><![CDATA[Thank you for your support!]]></Content>
            </xml>
          `);
          return;
        }
      });

  },
  'GET /wechat': async (req, res)=> {
          // Parse the URL and query parameters
    // Parse the URL and query parameters
    const url = new URL(req.url, `http://${req.headers.host}`);
    const signature = url.searchParams.get('signature') || '';
    const timestamp = url.searchParams.get('timestamp') || '';
    const nonce = url.searchParams.get('nonce') || '';
    const echostr = url.searchParams.get('echostr') || '';

    // Validate token
    const str = [TOKEN, timestamp, nonce].sort().join('');
    const hash = sha1(str);

    if (hash === signature) {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end(echostr); // Return echostr on successful validation
    } else {
      res.writeHead(401, { 'Content-Type': 'text/plain' });
      res.end('Token validation failed');
    }
  },
  'GET /cgi-bin/token': async (req, res)=> {
    try {
      const sdk = wxSdk({
        appId: process.env.VITE_APP_APPID || '',
        appSecret: process.env.VITE_APP_APPSECRET || '',
        cacheProvider: new RedisCacheProvider(new Redis()),
       }) as any;
      const response = await sdk.authenticate();
      // console.log('response', response);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      console.error('Error:', error.message);
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
}

// Handle incoming requests
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  console.log('Request:', req.method, req.url);

  try {
    // Parse the URL and query parameters
    for (const [key, value] of Object.entries(routes)) {
      const [method, path] = key.split(' ');
      if (req.method === method && req.url?.startsWith(path)) {
        value(req, res);
        return;
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
}

// Create and start the server
const PORT: number = Number(process.env.PORT) || 3000;
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
