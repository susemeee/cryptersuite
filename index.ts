
import Cryptersuite from './cryptersuite/index.ts';

Cryptersuite(Deno.env.get('APPROVE_KEY') ?? '', Number(Deno.env.get('PORT') ?? '8080'));
