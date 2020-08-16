import * as path from "https://deno.land/std@0.65.0/path/mod.ts";

import { Application, send, Context } from "https://deno.land/x/oak@v6.0.1/mod.ts";
import {
  viewEngine,
  engineFactory,
  adapterFactory,
} from "https://deno.land/x/view_engine@v1.3.0/mod.ts";

import { errorHandler } from './error-handler.ts';
import { save, load } from './db.ts';

export default async function run(port = 8000) {

  const denjuckEngine = engineFactory.getDenjuckEngine();
  const oakAdapter = adapterFactory.getOakAdapter();
  const app = new Application();
  app.use(viewEngine(oakAdapter, denjuckEngine));

  const cwd = path.dirname(path.fromFileUrl(import.meta.url));
  const sendOptions = {
    root: path.join(cwd, 'templates'),
    index: "index.html",
  };

  errorHandler(app);

  app.use(async (context: Context, next) => {
    switch (context.request.method) {
      case 'POST':
        const result = context.request.body();
        const forms = await result.value;

        if (context.request.url.pathname === '/d') {
          const key = forms.get('key');
          const code = forms.get('code');
          try {
            const decryptedCode = await load(key, code);
            context.response.body = decryptedCode;
          } catch (err) {
            throw err;
          }

        } else {
          const key = forms.get('key');
          const alias = forms.get('alias');
          const hostHeader = context.request.headers.get('Host');

          const code = await save(key, alias, hostHeader);
          //@ts-ignore
          await context.render(path.join(sendOptions.root, "success.html"), { code });
        }

        break;
      case 'GET':
      default:
        return next();
    }
  });

  app.use(async (context) => {
    await send(context, context.request.url.pathname, sendOptions);
  });


  await app.listen({ port });

}
