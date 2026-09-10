import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw Error('O armazenamento está temporariamente indisponível. Tente novamente.');return env.DB;}
