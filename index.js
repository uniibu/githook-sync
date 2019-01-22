const Koa = require('koa');
const Router = require('koa-router');
const bodyParser = require('koa-bodyparser');

const crypto = require('crypto');
const { exec } = require('child_process');
const config = require('config');

const app = new Koa();
const router = new Router();

const { secret } = config.get('Webhook');
const { repo } = config.get('Github');
const port = config.get('Port');

app.use(bodyParser());

const toSha1 = str => crypto.createHmac('sha1', secret).update(str).digest('hex');

router.post('/webhook', (ctx, next) => {
  const headerSig = ctx.request.get('x-hub-signature');
  const event = ctx.request.get('x-github-event');
  const body = ctx.request.body;
  if (body && headerSig && event === 'push') {
    const sigHash = toSha1(JSON.stringify(body));
    if (`sha1=${sigHash}` === headerSig) {
      ctx.body = { 'success': true }
      exec(`cd ${repo} && git pull`, (error, stdout, stderr) => {
        if (error) {
          console.error(`error: ${error}`);
          return;
        }
        console.log(stdout);
        if (stderr) {
          console.log(stderr);
        }
      });

    } else {
      ctx.status = 403;
      ctx.body = { 'success': false };
    }
  }
});

app.use(router.routes());

app.listen(port, () => {
  console.log('Listening on port', port);
})