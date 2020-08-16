import {
  green,
  cyan,
  bold,
  yellow,
  red,
} from "https://deno.land/std@0.62.0/fmt/colors.ts";

import { Application, Status, HttpError } from "https://deno.land/x/oak/mod.ts";

export function errorHandler(app: Application) {
  app.use(async (context, next) => {
    try {
      await next();
    } catch (e) {
      if (e instanceof HttpError) {
        // deno-lint-ignore no-explicit-any
        context.response.status = e.status as any;
        if (e.expose) {
          context.response.body = `<!DOCTYPE html>
              <html>
                <body>
                  <h1>${e.status} - ${e.message}</h1>
                </body>
              </html>`;
        } else {
          context.response.body = `<!DOCTYPE html>
              <html>
                <body>
                  <h1>${e.status} - ${Status[e.status]}</h1>
                </body>
              </html>`;
        }
      } else if (e instanceof Error) {
        context.response.status = 500;
        context.response.body = `<!DOCTYPE html>
              <html>
                <body>
                  <h1>500 - Internal Server Error</h1>
                </body>
              </html>`;
        console.log("Unhandled Error:", red(bold(e.message)));
        console.log(e.stack);
      }
    }
  });
}
