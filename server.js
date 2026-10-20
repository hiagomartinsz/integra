// servidor pra testar local: npm start -> http://localhost:3000

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

try { process.loadEnvFile(path.join(__dirname, '.env')); } catch (erro) { /* sem .env: usa as variáveis do sistema */ }

const { analisar, validarCorpo } = require('./api/ia');

const PORTA = Number(process.env.PORT) || 3000;
const PASTA_SITE = __dirname;

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.webp': 'image/webp',
};
const PASTAS_PUBLICAS = ['assets', 'css', 'js'];

function responderJson(res, status, dados) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
}

function lerCorpo(req) {
  return new Promise((resolver, rejeitar) => {
    let texto = '';
    req.on('data', (parte) => {
      texto += parte;
      if (texto.length > 4_000_000) { rejeitar(new Error('Corpo grande demais')); req.destroy(); }
    });
    req.on('end', () => resolver(texto));
    req.on('error', rejeitar);
  });
}

async function tratarIA(req, res) {
  let corpo;
  try {
    corpo = JSON.parse(await lerCorpo(req));
  } catch (erro) {
    return responderJson(res, 400, { erro: 'JSON inválido' });
  }
  if (!validarCorpo(corpo)) return responderJson(res, 400, { erro: 'Pedido incompleto' });

  try {
    responderJson(res, 200, await analisar(corpo));
  } catch (erro) {
    console.error('[IA]', erro.message);
    responderJson(res, 502, { erro: 'A IA não respondeu' });
  }
}

function servirArquivo(req, res) {
  const caminhoUrl = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
  const relativo = caminhoUrl === '/' ? 'index.html' : path.normalize(caminhoUrl).replace(/^[\\/]+/, '');
  const arquivo = path.join(PASTA_SITE, relativo);
  const primeiraPasta = relativo.split(/[\\/]/)[0];
  // só entrega as páginas .html da raiz e as pastas públicas (nunca .env, server.js ou node_modules)
  const permitido = arquivo.startsWith(PASTA_SITE)
    && (PASTAS_PUBLICAS.includes(primeiraPasta) || (!relativo.includes(path.sep) && relativo.endsWith('.html')));

  if (!permitido) { res.writeHead(404); return res.end('Não encontrado'); }
  fs.readFile(arquivo, (erro, conteudo) => {
    if (erro) { res.writeHead(404); return res.end('Não encontrado'); }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo).toLowerCase()] || 'application/octet-stream' });
    res.end(conteudo);
  });
}

http.createServer((req, res) => {
  if (req.url === '/api/ia' && req.method === 'POST') return tratarIA(req, res);
  if (req.method === 'GET') return servirArquivo(req, res);
  res.writeHead(405);
  res.end();
}).listen(PORTA, () => {
  console.log(`Integra+ rodando em http://localhost:${PORTA}`);
  if (!process.env.GEMINI_API_KEY) console.warn('Atenção: GEMINI_API_KEY não definida. A IA vai usar o modo simulado (palavras-chave).');
});
