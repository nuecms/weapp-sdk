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
        appId: 'wx95e5a58207fb5f67',
        appSecret: '282323a19761e2baba5e5b24ad60fa0f',
        cacheProvider: new RedisCacheProvider(new Redis()),
       }) as any;
      const response = await sdk.authenticate();

      const test = await sdk.createMenu({
        button: [
          {
            type: 'click',
            name: '今日歌曲',
            key: 'V1001_TODAY_MUSIC',
          },
          {
            name: '菜单',
            sub_button: [
              {
                type: 'view',
                name: '搜索',
                url: 'http://www.soso.com/',
              },
              {
                type: 'view',
                name: '视频',
                url: 'http://v.qq.com/',
              },
              {
                type: 'click',
                name: '赞一下我们',
                key: 'V1001_GOOD',
              },
            ],
          },
        ],
      });
      // console.log(test);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Internal Server Error');
    }
  }
}

// Handle incoming requests
function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  // Parse the URL and query parameters
  for (const [key, value] of Object.entries(routes)) {
    const [method, path] = key.split(' ');
    if (req.method === method && req.url?.startsWith(path)) {
      value(req, res);
      return;
    }
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
