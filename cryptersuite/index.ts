import * as path from "https://deno.land/std@0.65.0/path/mod.ts";

import { Application, send, helpers, httpErrors, Router } from "https://deno.land/x/oak@v6.0.1/mod.ts";
import {
  viewEngine,
  engineFactory,
  adapterFactory,
} from "https://deno.land/x/view_engine@v1.3.0/mod.ts";

import { errorHandler } from './error-handler.ts';
import { save, load, db, approve } from './db.ts';


function onClose() {
  console.warn('closing cryptersuite server');
  db.close();
}


export default async function run(approveKey: string, port = 8000) {

  window.addEventListener("unload", onClose);

  const denjuckEngine = engineFactory.getDenjuckEngine();
  const oakAdapter = adapterFactory.getOakAdapter();
  const app = new Application();
  app.use(viewEngine(oakAdapter, denjuckEngine));

  const cfd = path.dirname(path.fromFileUrl(import.meta.url));
  const sendOptions = {
    root: path.join(cfd, 'templates'),
    index: "index.html",
  };

  errorHandler(app);

  const router = new Router();

  router
  .post('/', async (context) => {
    const result = context.request.body();
    const forms = await result.value;

    const key = forms.get('key');
    const alias = forms.get('alias');
    const hostHeader = context.request.headers.get('Host');

    const code = await save(key, alias, hostHeader);
    //@ts-ignore
    await context.render(path.join(sendOptions.root, "success.html"), { code });
  })
  .post('/d', async (context) => {
    const result = context.request.body();
    const forms = await result.value;
    const key = forms.get('key');
    const code = forms.get('code');
    try {
      context.response.headers.set('Access-Control-Allow-Origin', '*');
      const decryptedCode = await load(key, code);
      if (!decryptedCode) {
        throw httpErrors.NotFound;
      } else {
        context.response.body = decryptedCode;
      }
    } catch (err) {
      throw err;
    }
  })
  .get('/aliases/:alias/approve', async (context) => {

    const alias = context.params?.alias;
    const { masterKey = '' } = helpers.getQuery(context);
    if (!alias) {
      throw httpErrors.BadRequest;
    } if (masterKey !== approveKey) {
      throw httpErrors.Unauthorized;
    } else {
      await approve(alias);
      context.response.body = '1';
    }

  });

  app.use(router.routes());
  app.use(router.allowedMethods());

  app.use(async (context) => {
    await send(context, context.request.url.pathname, sendOptions);
  });

  console.log(`opening cryptersuite server on port ${port}`);
  await app.listen({ port });

}
