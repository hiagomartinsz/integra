// informações da empresa: o que a IA usa pra responder as dúvidas
// (perguntas frequentes + texto extraído dos documentos)

const dados = carregarDados();
const sessao = exigirSessao(dados, 'gestor');
const pagina = document.getElementById('pagina');

const MAX_CARACTERES_POR_DOCUMENTO = 60000;
const MAX_CARACTERES_TOTAL = 150000; // o mesmo limite do api/ia.js
const PDFJS = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';

function salvar() {
  salvarDados(dados);
  const agora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const status = document.getElementById('statusSalvo');
  if (status) status.innerHTML = `${icone('check')}Salvo às ${agora}`;
}

// leitura de PDF e TXT

let carregandoPdfjs = null;
function carregarPdfjs() {
  if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  if (!carregandoPdfjs) {
    carregandoPdfjs = new Promise((resolver, rejeitar) => {
      const script = document.createElement('script');
      script.src = `${PDFJS}pdf.min.js`;
      script.onload = () => {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = `${PDFJS}pdf.worker.min.js`;
        resolver(window.pdfjsLib);
      };
      script.onerror = () => {
        carregandoPdfjs = null;
        rejeitar(new Error('Não foi possível carregar o leitor de PDF. Verifique a conexão com a internet.'));
      };
      document.head.appendChild(script);
    });
  }
  return carregandoPdfjs;
}

async function textoDoPdf(conteudo) {
  const pdfjs = await carregarPdfjs();
  const pdf = await pdfjs.getDocument({ data: conteudo }).promise;
  const paginas = [];
  for (let numero = 1; numero <= pdf.numPages; numero += 1) {
    const { items } = await (await pdf.getPage(numero)).getTextContent();
    paginas.push(items.map((item) => item.str + (item.hasEOL ? '\n' : ' ')).join(''));
  }
  return paginas.join('\n\n');
}

async function extrairTexto(arquivo, nome) {
  const ehPdf = arquivo.type === 'application/pdf' || /\.pdf$/i.test(nome);
  const bruto = ehPdf ? await textoDoPdf(await arquivo.arrayBuffer()) : await arquivo.text();
  const texto = bruto.replace(/[ \t]+/g, ' ').replace(/ *\n */g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (texto.length < 40) {
    throw new Error(ehPdf
      ? 'Não encontrei texto neste PDF. Ele parece ser uma imagem escaneada, que a IA não consegue ler.'
      : 'O arquivo está vazio.');
  }
  return texto;
}

function totalDeCaracteres(semId = null) {
  return dados.empresa.documentos.filter((d) => d.id !== semId).reduce((soma, d) => soma + d.texto.length, 0);
}

// adiciona um documento respeitando os limites. Devolve a mensagem do aviso
function adicionarDocumento(documento) {
  let aviso = 'A IA já pode consultar este documento.';
  if (documento.texto.length > MAX_CARACTERES_POR_DOCUMENTO) {
    documento.texto = documento.texto.slice(0, MAX_CARACTERES_POR_DOCUMENTO);
    aviso = 'Documento muito longo: a IA vai consultar só o começo dele.';
  }
  if (totalDeCaracteres() + documento.texto.length > MAX_CARACTERES_TOTAL) {
    throw new Error('Limite de documentos atingido. Remova algum documento antes de adicionar outro.');
  }
  dados.empresa.documentos.push({ id: novoId('doc'), adicionadoEm: dataISO(), ...documento });
  salvar();
  return aviso;
}

// treinamentos que podem ser lidos

function treinamentoTemPdf(treinamento) {
  const { fonte } = treinamento;
  return fonte.tipo === 'arquivo' || (fonte.tipo === 'url' && /\.pdf($|[?#])/i.test(fonte.url));
}

async function arquivoDoTreinamento(treinamento) {
  const { fonte } = treinamento;
  const endereco = fonte.tipo === 'arquivo' ? await enderecoDoArquivo(fonte.arquivoId) : fonte.url;
  if (!endereco) throw new Error('O arquivo deste treinamento não foi encontrado neste navegador.');
  const resposta = await fetch(endereco);
  if (!resposta.ok) throw new Error('Não foi possível abrir o arquivo deste treinamento.');
  return resposta.blob();
}

function documentoDoTreinamento(treinamentoId) {
  return dados.empresa.documentos.find((d) => d.treinamentoId === treinamentoId);
}

// guia da página e dados de exemplo

function quantidadeDeExemplos() {
  return dados.empresa.informacoes.filter((i) => i.exemplo).length + dados.empresa.documentos.filter((d) => d.exemplo).length;
}

function htmlAvisoDeExemplos() {
  const total = quantidadeDeExemplos();
  if (!total) return '';
  return `
    <div class="guia-alerta" id="avisoExemplos">
      ${icone('alerta')}
      <div>
        <p><strong>${total === 1 ? '1 item veio preenchido' : `${total} itens vieram preenchidos`} com dados de uma empresa fictícia</strong>, marcados com <span class="selo selo-novo">Exemplo</span>. A IA usa esses dados como se fossem verdadeiros: troque pelas informações da sua empresa ou apague. Ao editar um item, ele deixa de ser exemplo.</p>
        <div class="guia-acoes" data-apagar-exemplos-area>
          <button class="btn btn-secundario btn-pequeno" type="button" data-apagar-exemplos>${icone('lixeira')}Apagar todos os exemplos</button>
        </div>
      </div>
    </div>`;
}

function htmlGuia() {
  if (dados.empresa.guiaOculto) return htmlAvisoDeExemplos() ? `<section class="cartao guia-empresa">${htmlAvisoDeExemplos()}</section>` : '';
  const passos = [
    ['relogio', 'Perguntas que a IA não soube responder', 'Quando a IA não encontra uma resposta, o colaborador pode pedir para você cadastrá-la. Responda uma vez e a IA passa a saber para todos.'],
    ['ajuda', 'Respostas para perguntas frequentes', 'Regras e combinados da empresa: horário, férias, benefícios, pagamento… Cada item tem um assunto (sobre o que é) e a resposta que a IA deve dar.'],
    ['arquivo', 'Documentos que a IA consulta', 'Ligue os treinamentos em PDF que a IA pode ler, ou anexe outros documentos, como um manual de benefícios. A IA cita de qual documento tirou a resposta.'],
    ['play', 'Cursos que a IA recomenda', 'Vídeos gratuitos do YouTube organizados por tema. O catálogo começa com sugestões gerais: mantenha as úteis, remova as que não servem e adicione as do seu ramo.'],
  ];
  return `
    <section class="cartao guia-empresa" id="guia">
      <div class="cabecalho-cartao">
        <div>
          <h2 class="titulo-cartao titulo-com-icone">${icone('brilho')}Como configurar a IA da sua empresa</h2>
          <p class="subtitulo">A IA responde os colaboradores usando só o que estiver nesta página. Veja o que cada parte faz:</p>
        </div>
        <button class="btn btn-texto btn-pequeno" type="button" data-ocultar-guia>Ocultar guia</button>
      </div>
      <ol class="guia-passos">
        ${passos.map(([nomeIcone, titulo, texto]) => `
          <li><span class="guia-icone">${icone(nomeIcone)}</span><span><strong>${titulo}</strong><small>${texto}</small></span></li>`).join('')}
      </ol>
      ${htmlAvisoDeExemplos()}
    </section>`;
}

// remove os dados de exemplo. Os treinamentos continuam na aba Treinamentos
function apagarExemplos() {
  dados.empresa.informacoes = dados.empresa.informacoes.filter((i) => !i.exemplo);
  dados.empresa.documentos = dados.empresa.documentos.filter((d) => !d.exemplo);
  salvar();
}

// perguntas que a IA não soube responder

function responderPendente(pendente, assunto, resposta) {
  const agora = new Date().toISOString();
  dados.empresa.informacoes.push({ id: novoId('inf'), assunto, resposta });
  const pessoa = buscarColaborador(dados, pendente.colaboradorId);
  const registro = pessoa && pessoa.registros.find((r) => r.id === pendente.registroId);
  if (registro && registro.analise) {
    registro.analise.pedido = { id: pendente.id, situacao: 'respondida', resposta, respondidaEm: agora };
    notificar(dados, pessoa.id, `${dados.gestor.nome} respondeu sua pergunta: “${pendente.pergunta}”`, 'duvidas.html');
  }
  dados.empresa.perguntasPendentes = dados.empresa.perguntasPendentes.filter((p) => p.id !== pendente.id);
  salvar();
}

function descartarPendente(pendente) {
  const pessoa = buscarColaborador(dados, pendente.colaboradorId);
  const registro = pessoa && pessoa.registros.find((r) => r.id === pendente.registroId);
  if (registro && registro.analise) {
    registro.analise.pedido = { id: pendente.id, situacao: 'descartada' };
    notificar(dados, pessoa.id, `${dados.gestor.nome} não cadastrou uma resposta geral para “${pendente.pergunta}”. Se precisar, envie sua dúvida direto para ele.`, 'duvidas.html');
  }
  dados.empresa.perguntasPendentes = dados.empresa.perguntasPendentes.filter((p) => p.id !== pendente.id);
  salvar();
}

function htmlPendentes() {
  const pendentes = dados.empresa.perguntasPendentes;
  return `
    <section class="cartao bloco-empresa ${pendentes.length ? 'com-pendentes' : ''}" id="pendentes">
      <h2 class="titulo-cartao titulo-com-icone">${icone('relogio')}Perguntas que a IA não soube responder${pendentes.length ? ` <span class="selo selo-atencao">${pendentes.length}</span>` : ''}</h2>
      <p class="subtitulo">Quando a IA não encontra a resposta, o colaborador pode pedir para você cadastrá-la. A resposta vai para quem perguntou e passa a valer para todos.</p>
      ${pendentes.length ? pendentes.map((p) => {
        const pessoa = buscarColaborador(dados, p.colaboradorId);
        return `
          <form class="pendente" data-form-pendente="${p.id}">
            <p class="pendente-pergunta">“${escaparHtml(p.pergunta)}”</p>
            <small class="pendente-autor">${pessoa ? escaparHtml(pessoa.nome) : 'Colaborador'} · ${tempoRelativo(p.data)}</small>
            <div class="campo">
              <label for="assunto-pendente-${p.id}">Assunto</label>
              <input id="assunto-pendente-${p.id}" name="assunto" required value="${escaparHtml(p.pergunta)}">
            </div>
            <div class="campo">
              <label for="resposta-pendente-${p.id}">Resposta</label>
              <textarea id="resposta-pendente-${p.id}" name="resposta" rows="2" required placeholder="O que a IA deve responder sobre isso daqui em diante?"></textarea>
            </div>
            <div class="pendente-acoes">
              <button class="btn btn-texto btn-pequeno" type="button" data-descartar-pendente="${p.id}">Descartar</button>
              <button class="btn btn-primario btn-pequeno" type="submit">${icone('check')}Responder e salvar</button>
            </div>
          </form>`;
      }).join('') : `<div class="estado-ok">${icone('check')}Nenhuma pergunta pendente.</div>`}
    </section>`;
}

// catálogo de cursos

const NIVEIS = { basico: 'Básico', intermediario: 'Intermediário', avancado: 'Avançado' };
const temasAbertos = new Set();

// título e canal do vídeo pelo oEmbed do YouTube (sem chave)
async function dadosDoVideo(videoId) {
  try {
    const resposta = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}`, { signal: AbortSignal.timeout(8000) });
    if (!resposta.ok) return null;
    const video = await resposta.json();
    return { titulo: video.title, canal: video.author_name };
  } catch (erro) {
    return null;
  }
}

function htmlSeletorDeNivel(nome, atual, atributos = '') {
  return `<select name="${nome}" ${atributos}>${Object.entries(NIVEIS).map(([id, rotulo]) => `<option value="${id}" ${id === atual ? 'selected' : ''}>${rotulo}</option>`).join('')}</select>`;
}

function htmlTema(tema) {
  return `
    <details class="tema-catalogo" data-tema="${tema.id}" ${temasAbertos.has(tema.id) ? 'open' : ''}>
      <summary>
        <strong data-nome-tema>${escaparHtml(tema.nome) || 'Novo tema'}</strong>
        <small>${tema.cursos.length} ${tema.cursos.length === 1 ? 'curso' : 'cursos'}</small>
      </summary>
      <div class="tema-corpo">
        <div class="campo">
          <label for="nome-tema-${tema.id}">Nome do tema</label>
          <input id="nome-tema-${tema.id}" value="${escaparHtml(tema.nome)}" data-campo-tema="nome" placeholder="Ex.: Atendimento ao cliente">
        </div>
        ${tema.cursos.length ? `<ul class="cursos-do-tema">
          ${tema.cursos.map((c) => `
            <li data-video="${c.videoId}">
              <a class="curso-tema-capa" href="https://www.youtube.com/watch?v=${c.videoId}" target="_blank" rel="noopener" title="Abrir no YouTube"><img src="https://i.ytimg.com/vi/${c.videoId}/mqdefault.jpg" alt="" loading="lazy"></a>
              <span class="curso-tema-texto">
                <label class="so-leitor" for="titulo-${tema.id}-${c.videoId}">Título</label>
                <input id="titulo-${tema.id}-${c.videoId}" class="campo-inline" value="${escaparHtml(c.titulo)}" data-campo-curso="titulo">
                <small>${escaparHtml(c.canal || 'YouTube')}</small>
              </span>
              <label class="so-leitor" for="nivel-${tema.id}-${c.videoId}">Nível</label>
              ${htmlSeletorDeNivel('nivel', c.nivel, `id="nivel-${tema.id}-${c.videoId}" data-campo-curso="nivel"`)}
              <button class="btn-fechar" type="button" data-remover-curso aria-label="Remover ${escaparHtml(c.titulo)}">${icone('lixeira')}</button>
            </li>`).join('')}
        </ul>` : '<p class="texto-vazio">Nenhum curso neste tema. Enquanto estiver vazio, a IA não recomenda nada sobre ele.</p>'}
        <form class="form-curso-tema" data-form-curso="${tema.id}">
          <label class="so-leitor" for="link-${tema.id}">Link do YouTube</label>
          <input id="link-${tema.id}" name="link" type="url" required placeholder="Cole o link de um vídeo do YouTube">
          <label class="so-leitor" for="novo-nivel-${tema.id}">Nível</label>
          ${htmlSeletorDeNivel('nivel', 'basico', `id="novo-nivel-${tema.id}"`)}
          <button class="btn btn-secundario btn-pequeno" type="submit">${icone('mais')}Adicionar curso</button>
        </form>
        <div class="tema-rodape">
          <button class="btn-texto-perigo" type="button" data-remover-tema>${icone('lixeira')}Remover tema</button>
        </div>
      </div>
    </details>`;
}

function htmlCatalogo() {
  return `
    <section class="cartao bloco-empresa">
      <h2 class="titulo-cartao titulo-com-icone">${icone('play')}Cursos que a IA recomenda</h2>
      <p class="subtitulo">Quando um colaborador relata uma dificuldade, a IA escolhe o tema e recomenda até 2 cursos dele, conforme o nível que a pessoa precisa. Cole links de vídeos do YouTube: o título e o canal são preenchidos sozinhos.</p>
      <div class="lista-temas">${dados.empresa.temas.map(htmlTema).join('')}</div>
      <button class="btn-adicionar-fase" data-adicionar-tema>${icone('mais')}Adicionar tema</button>
    </section>`;
}

async function adicionarCurso(formulario) {
  const tema = dados.empresa.temas.find((t) => t.id === formulario.dataset.formCurso);
  const videoId = idDoYoutube(formulario.link.value.trim());
  if (!videoId) {
    mostrarAviso('Cole o link de um vídeo do YouTube.', 'alerta');
    return;
  }
  if (tema.cursos.some((c) => c.videoId === videoId)) {
    mostrarAviso('Este vídeo já está neste tema.', 'alerta');
    return;
  }
  const botao = formulario.querySelector('[type="submit"]');
  botao.disabled = true;
  const video = await dadosDoVideo(videoId);
  tema.cursos.push({ titulo: video ? video.titulo : 'Vídeo do YouTube', canal: video ? video.canal : '', videoId, nivel: formulario.nivel.value });
  temasAbertos.add(tema.id);
  salvar();
  renderizar();
  mostrarAviso(video ? `Curso adicionado: ${video.titulo}` : 'Curso adicionado. Não consegui buscar o título: edite-o na lista.');
}

// tela

function tamanhoDoTexto(texto) {
  const palavras = texto.split(/\s+/).length;
  return `${palavras.toLocaleString('pt-BR')} palavras`;
}

function htmlInformacao(info) {
  return `
    <article class="info-empresa ${info.exemplo ? 'eh-exemplo' : ''}" data-info="${info.id}">
      <div class="info-empresa-campos">
        ${info.exemplo ? '<span class="selo selo-novo selo-exemplo" data-selo-exemplo title="Dado de uma empresa fictícia. Troque pelo da sua empresa.">Exemplo</span>' : ''}
        <label class="so-leitor" for="assunto-${info.id}">Assunto</label>
        <input id="assunto-${info.id}" class="campo-inline campo-subtitulo" value="${escaparHtml(info.assunto)}" data-campo="assunto" placeholder="Assunto (ex.: Férias e folgas)">
        <label class="so-leitor" for="resposta-${info.id}">Resposta</label>
        <textarea id="resposta-${info.id}" class="campo-inline campo-descricao" rows="2" data-campo="resposta" placeholder="O que a IA deve responder sobre esse assunto?">${escaparHtml(info.resposta)}</textarea>
      </div>
      <button class="btn-fechar" data-remover-info="${info.id}" aria-label="Remover ${escaparHtml(info.assunto || 'informação')}">${icone('lixeira')}</button>
    </article>`;
}

function htmlTreinamentos() {
  const legiveis = dados.treinamentos.filter(treinamentoTemPdf);
  const outros = dados.treinamentos.length - legiveis.length;
  if (!legiveis.length) return '<p class="texto-vazio">Nenhum treinamento em PDF. Publique um em <a href="gestor-treinamentos.html">Treinamentos</a>.</p>';
  return `
    <div class="lista-documentos">
      ${legiveis.map((t) => {
        const documento = documentoDoTreinamento(t.id);
        return `
          <label class="interruptor">
            <input type="checkbox" data-treinamento-ia="${t.id}" ${documento ? 'checked' : ''}>
            <span class="interruptor-trilho"><span class="interruptor-bola"></span></span>
            <span class="interruptor-texto">
              <strong>${icone(FORMATOS_TREINAMENTO[t.formato].icone)}${escaparHtml(t.titulo)}</strong>
              <small data-estado-treinamento="${t.id}">${documento ? `A IA consulta este treinamento · ${tamanhoDoTexto(documento.texto)}` : 'A IA não consulta este treinamento'}</small>
              ${documento && documento.exemplo ? '<span class="selo selo-novo selo-exemplo" data-selo-exemplo title="Dado de uma empresa fictícia. Troque pelo da sua empresa.">Exemplo</span>' : ''}
            </span>
          </label>`;
      }).join('')}
    </div>
    ${outros ? `<p class="texto-vazio nota-documentos">${outros} ${outros === 1 ? 'treinamento é vídeo ou link e não aparece' : 'treinamentos são vídeos ou links e não aparecem'} aqui: a IA só lê texto.</p>` : ''}`;
}

function htmlArquivosAvulsos() {
  const avulsos = dados.empresa.documentos.filter((d) => d.origem === 'arquivo');
  return `
    ${avulsos.length ? `<ul class="lista-arquivos-ia">
      ${avulsos.map((d) => `
        <li>
          <span class="formato-icone">${icone('arquivo')}</span>
          <span class="treinamento-mini-texto"><strong>${escaparHtml(d.nome)}</strong><span>${tamanhoDoTexto(d.texto)} · adicionado em ${formatarData(d.adicionadoEm)}</span></span>
          <button class="btn-fechar" data-remover-documento="${d.id}" aria-label="Remover ${escaparHtml(d.nome)}">${icone('lixeira')}</button>
        </li>`).join('')}
    </ul>` : ''}
    <label class="area-envio" for="arquivoIA">
      ${icone('upload')}
      <span id="textoEnvioIA">Anexar documento (PDF ou TXT)</span>
      <small>Ex.: manual de benefícios, política de home office, código de conduta</small>
    </label>
    <input id="arquivoIA" type="file" accept=".pdf,application/pdf,.txt,text/plain,.md" class="so-leitor">`;
}

function htmlUso() {
  const total = totalDeCaracteres();
  return `${Math.round((total / MAX_CARACTERES_TOTAL) * 100)}% do espaço para documentos em uso`;
}

function renderizar() {
  pagina.innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Informações da empresa</h1>
        <p>Tudo o que você cadastrar aqui a IA usa para responder as dúvidas dos colaboradores e recomendar cursos na tela Dúvidas.</p>
      </div>
      <div class="cabecalho-acoes">
        ${dados.empresa.guiaOculto ? `<button class="link-discreto" data-mostrar-guia>${icone('ajuda')}Como usar esta página</button>` : ''}
        <span class="status-salvo" id="statusSalvo">${icone('check')}Alterações salvas automaticamente</span>
      </div>
    </div>

    ${htmlGuia()}

    ${htmlPendentes()}

    <section class="cartao bloco-empresa">
      <h2 class="titulo-cartao titulo-com-icone">${icone('ajuda')}Respostas para perguntas frequentes</h2>
      <p class="subtitulo">Horários, férias, benefícios, pagamentos… Se alguém perguntar sobre o assunto, a IA responde com o texto que você escrever. Estas respostas valem mais que os documentos quando os dois dizem coisas diferentes.</p>
      <div class="lista-info-empresa" id="listaInformacoes">
        ${dados.empresa.informacoes.map(htmlInformacao).join('') || '<p class="texto-vazio">Nenhuma informação cadastrada.</p>'}
      </div>
      <button class="btn-adicionar-fase" data-adicionar-info>${icone('mais')}Adicionar informação</button>
    </section>

    <section class="cartao bloco-empresa">
      <h2 class="titulo-cartao titulo-com-icone">${icone('arquivo')}Documentos que a IA consulta</h2>
      <p class="subtitulo">A IA lê o texto destes documentos para responder perguntas sobre a empresa, como regras, ferramentas e rituais do time.</p>

      <h3 class="subtitulo-bloco">Treinamentos</h3>
      ${htmlTreinamentos()}

      <h3 class="subtitulo-bloco">Outros documentos</h3>
      ${htmlArquivosAvulsos()}

      <p class="nota-documentos">
        ${icone('alerta')}<span>O texto dos documentos é enviado ao Google Gemini junto com cada pergunta. Não anexe dados pessoais ou confidenciais. ${htmlUso()}.</span>
      </p>
    </section>

    ${htmlCatalogo()}`;
}

// ações

async function alternarTreinamento(caixa) {
  const treinamento = dados.treinamentos.find((t) => t.id === caixa.dataset.treinamentoIa);
  const estado = pagina.querySelector(`[data-estado-treinamento="${treinamento.id}"]`);

  if (!caixa.checked) {
    dados.empresa.documentos = dados.empresa.documentos.filter((d) => d.treinamentoId !== treinamento.id);
    salvar();
    renderizar();
    mostrarAviso('A IA não consulta mais este treinamento.');
    return;
  }

  caixa.disabled = true;
  estado.textContent = 'Lendo o arquivo…';
  try {
    const nome = treinamento.fonte.nomeArquivo || `${treinamento.titulo}.pdf`;
    const texto = await extrairTexto(await arquivoDoTreinamento(treinamento), nome);
    const aviso = adicionarDocumento({ nome: treinamento.titulo, origem: 'treinamento', treinamentoId: treinamento.id, texto });
    renderizar();
    mostrarAviso(aviso);
  } catch (erro) {
    caixa.checked = false;
    caixa.disabled = false;
    estado.textContent = 'A IA não consulta este treinamento';
    mostrarAviso(erro.message, 'alerta');
  }
}

async function anexarArquivo(entrada) {
  const arquivo = entrada.files[0];
  if (!arquivo) return;
  const texto = document.getElementById('textoEnvioIA');
  texto.textContent = `Lendo ${arquivo.name}…`;
  try {
    const conteudo = await extrairTexto(arquivo, arquivo.name);
    const aviso = adicionarDocumento({ nome: arquivo.name.replace(/\.(pdf|txt|md)$/i, ''), origem: 'arquivo', texto: conteudo });
    renderizar();
    mostrarAviso(aviso);
  } catch (erro) {
    texto.textContent = 'Anexar documento (PDF ou TXT)';
    entrada.value = '';
    mostrarAviso(erro.message, 'alerta');
  }
}

// tema e curso do catálogo a partir de um elemento da tela
function temaDoElemento(elemento) {
  const caixa = elemento.closest('[data-tema]');
  return caixa && dados.empresa.temas.find((t) => t.id === caixa.dataset.tema);
}
function cursoDoElemento(tema, elemento) {
  const item = elemento.closest('[data-video]');
  return item && tema.cursos.find((c) => c.videoId === item.dataset.video);
}

function iniciar() {
  if (!sessao) return;
  montarLayout({ dados, perfil: 'gestor', pagina: 'empresa' });
  renderizar();
  // a página é montada por JavaScript, então o link #pendentes precisa rolar manualmente
  if (location.hash) document.querySelector(location.hash)?.scrollIntoView();

  pagina.addEventListener('input', (evento) => {
    const tema = temaDoElemento(evento.target);
    if (tema && evento.target.dataset.campoTema) {
      tema.nome = evento.target.value;
      evento.target.closest('[data-tema]').querySelector('[data-nome-tema]').textContent = tema.nome || 'Novo tema';
      salvar();
      return;
    }
    if (tema && evento.target.dataset.campoCurso === 'titulo') {
      cursoDoElemento(tema, evento.target).titulo = evento.target.value;
      salvar();
      return;
    }
    const cartao = evento.target.closest('[data-info]');
    const campo = evento.target.dataset.campo;
    if (!cartao || !campo) return;
    const info = dados.empresa.informacoes.find((i) => i.id === cartao.dataset.info);
    info[campo] = evento.target.value;
    if (info.exemplo) {
      // editado pelo gestor: deixa de ser exemplo (atualiza a tela sem redesenhar, para manter o foco)
      delete info.exemplo;
      cartao.classList.remove('eh-exemplo');
      cartao.querySelector('[data-selo-exemplo]')?.remove();
      const aviso = document.getElementById('avisoExemplos');
      if (aviso) {
        const novo = htmlAvisoDeExemplos();
        if (novo) aviso.outerHTML = novo;
        else (aviso.closest('.guia-empresa:not(#guia)') || aviso).remove();
      }
    }
    salvar();
  });

  pagina.addEventListener('change', (evento) => {
    if (evento.target.matches('[data-treinamento-ia]')) alternarTreinamento(evento.target);
    if (evento.target.id === 'arquivoIA') anexarArquivo(evento.target);
    if (evento.target.dataset.campoCurso === 'nivel') {
      const tema = temaDoElemento(evento.target);
      cursoDoElemento(tema, evento.target).nivel = evento.target.value;
      salvar();
    }
  });

  // lembra quais temas estão abertos para não fechá-los ao redesenhar
  pagina.addEventListener('toggle', (evento) => {
    const caixa = evento.target.closest && evento.target.closest('[data-tema]');
    if (!caixa) return;
    if (caixa.open) temasAbertos.add(caixa.dataset.tema);
    else temasAbertos.delete(caixa.dataset.tema);
  }, true);

  pagina.addEventListener('submit', (evento) => {
    evento.preventDefault();
    const formulario = evento.target;
    if (formulario.dataset.formCurso) {
      adicionarCurso(formulario);
      return;
    }
    if (formulario.dataset.formPendente) {
      const pendente = dados.empresa.perguntasPendentes.find((p) => p.id === formulario.dataset.formPendente);
      responderPendente(pendente, formulario.assunto.value.trim(), formulario.resposta.value.trim());
      renderizar();
      mostrarAviso('Resposta enviada e salva nas informações da empresa.');
    }
  });

  pagina.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-ocultar-guia]') || evento.target.closest('[data-mostrar-guia]')) {
      dados.empresa.guiaOculto = Boolean(evento.target.closest('[data-ocultar-guia]'));
      salvar();
      renderizar();
      if (!dados.empresa.guiaOculto) document.getElementById('guia').scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (evento.target.closest('[data-apagar-exemplos]')) {
      // pede confirmação no próprio aviso
      evento.target.closest('[data-apagar-exemplos-area]').innerHTML = `
        <span>Apagar as respostas e o documento de exemplo? Os treinamentos continuam na aba Treinamentos.</span>
        <button class="btn btn-texto btn-pequeno" type="button" data-cancelar-exemplos>Cancelar</button>
        <button class="btn btn-perigo btn-pequeno" type="button" data-confirmar-exemplos>Apagar exemplos</button>`;
      return;
    }
    if (evento.target.closest('[data-cancelar-exemplos]')) {
      renderizar();
      return;
    }
    if (evento.target.closest('[data-confirmar-exemplos]')) {
      apagarExemplos();
      renderizar();
      mostrarAviso('Exemplos apagados. Agora cadastre as informações da sua empresa.', 'lixeira');
      return;
    }
    if (evento.target.closest('[data-adicionar-info]')) {
      const info = { id: novoId('inf'), assunto: '', resposta: '' };
      dados.empresa.informacoes.push(info);
      salvar();
      renderizar();
      document.getElementById(`assunto-${info.id}`).focus();
      return;
    }
    if (evento.target.closest('[data-adicionar-tema]')) {
      const tema = { id: novoId('tema'), nome: '', palavras: [], cursos: [] };
      dados.empresa.temas.push(tema);
      temasAbertos.add(tema.id);
      salvar();
      renderizar();
      document.getElementById(`nome-tema-${tema.id}`).focus();
      return;
    }
    const descartar = evento.target.closest('[data-descartar-pendente]');
    if (descartar) {
      descartarPendente(dados.empresa.perguntasPendentes.find((p) => p.id === descartar.dataset.descartarPendente));
      renderizar();
      mostrarAviso('Pergunta descartada. O colaborador foi avisado.', 'lixeira');
      return;
    }
    const tema = temaDoElemento(evento.target);
    if (tema && evento.target.closest('[data-remover-curso]')) {
      const curso = cursoDoElemento(tema, evento.target);
      tema.cursos = tema.cursos.filter((c) => c !== curso);
      salvar();
      renderizar();
      mostrarAviso('Curso removido do catálogo.', 'lixeira');
      return;
    }
    if (tema && evento.target.closest('[data-remover-tema]')) {
      dados.empresa.temas = dados.empresa.temas.filter((t) => t !== tema);
      salvar();
      renderizar();
      mostrarAviso(`Tema "${tema.nome || 'sem nome'}" removido.`, 'lixeira');
      return;
    }
    const removerInfo = evento.target.closest('[data-remover-info]');
    if (removerInfo) {
      dados.empresa.informacoes = dados.empresa.informacoes.filter((i) => i.id !== removerInfo.dataset.removerInfo);
      salvar();
      renderizar();
      mostrarAviso('Informação removida.', 'lixeira');
      return;
    }
    const removerDocumento = evento.target.closest('[data-remover-documento]');
    if (removerDocumento) {
      dados.empresa.documentos = dados.empresa.documentos.filter((d) => d.id !== removerDocumento.dataset.removerDocumento);
      salvar();
      renderizar();
      mostrarAviso('Documento removido.', 'lixeira');
    }
  });
}

iniciar();
