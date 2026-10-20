// arquivos enviados pelo gestor (pdf, vídeo, slides). ficam no IndexedDB por enquanto

const BANCO_ARQUIVOS = 'integra-arquivos';

function abrirBancoDeArquivos() {
  return new Promise((resolver, rejeitar) => {
    const pedido = indexedDB.open(BANCO_ARQUIVOS, 1);
    pedido.onupgradeneeded = () => pedido.result.createObjectStore('arquivos');
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });
}

async function salvarArquivo(arquivo) {
  const banco = await abrirBancoDeArquivos();
  const id = novoId('arq');
  await new Promise((resolver, rejeitar) => {
    const transacao = banco.transaction('arquivos', 'readwrite');
    transacao.objectStore('arquivos').put(arquivo, id);
    transacao.oncomplete = resolver;
    transacao.onerror = () => rejeitar(transacao.error);
  });
  return id;
}

// devolve um endereço temporário (blob:) pra exibir o arquivo, ou null
async function enderecoDoArquivo(id) {
  const banco = await abrirBancoDeArquivos();
  const arquivo = await new Promise((resolver, rejeitar) => {
    const pedido = banco.transaction('arquivos').objectStore('arquivos').get(id);
    pedido.onsuccess = () => resolver(pedido.result);
    pedido.onerror = () => rejeitar(pedido.error);
  });
  return arquivo ? URL.createObjectURL(arquivo) : null;
}

async function removerArquivo(id) {
  const banco = await abrirBancoDeArquivos();
  banco.transaction('arquivos', 'readwrite').objectStore('arquivos').delete(id);
}
