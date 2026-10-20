const dados = carregarDados();
const sessao = exigirSessao(dados, 'gestor');
const pagina = document.getElementById('pagina');
let idParaRemover = null;

const REGRAS_FORMATO = {
  pdf: { aceita: '.pdf,application/pdf', dica: 'Arquivo PDF', link: 'Ou cole um link para o PDF' },
  video: { aceita: 'video/*', dica: 'MP4 ou WEBM', link: 'Ou cole um link do YouTube' },
  slides: { aceita: '.pdf,application/pdf', dica: 'Exporte a apresentação em PDF', link: 'Ou cole um link do Google Slides' },
  link: { aceita: null, dica: '', link: 'Link do treinamento' },
};

function conclusaoDoTreinamento(treinamento) {
  const pessoas = dados.colaboradores
    .filter((c) => !situacaoNaJornada(dados, c).concluido)
    .map((c) => ({ c, info: treinamentosDaPessoa(dados, c).find((t) => t.id === treinamento.id) }))
    .filter(({ info }) => info.liberado);
  return {
    pessoas,
    feitos: pessoas.filter((p) => p.info.concluidoEm).length,
    atrasados: pessoas.filter((p) => p.info.atrasado).length,
  };
}

function renderizar() {
  const fases = fasesComPeriodo(dados);
  pagina.innerHTML = `
    <div class="cabecalho-pagina">
      <div>
        <h1>Treinamentos</h1>
        <p>Treinamento admissional, manuais, vídeos e apresentações. Cada treinamento é liberado automaticamente quando a pessoa chega na fase escolhida.</p>
      </div>
      <button class="btn btn-primario" data-novo-treinamento>${icone('mais')}Novo treinamento</button>
    </div>
    ${fases.map((fase) => {
      const daFase = dados.treinamentos.filter((t) => t.faseId === fase.id);
      return `
        <h2 class="subtitulo-bloco">Fase ${fase.indice + 1} · ${fase.nome} <small>(${textoDoPeriodo(fase)})</small></h2>
        ${daFase.length ? `<div class="lista-treinamentos">
          ${daFase.map((t) => {
            const { pessoas, feitos, atrasados } = conclusaoDoTreinamento(t);
            return `
              <article class="cartao treinamento treinamento-gestor">
                <span class="treinamento-icone formato-${t.formato}">${icone(FORMATOS_TREINAMENTO[t.formato].icone)}</span>
                <span class="treinamento-texto">
                  <span class="treinamento-meta">${FORMATOS_TREINAMENTO[t.formato].nome}${t.obrigatorio ? ' · <strong>Obrigatório</strong>' : ' · Opcional'}</span>
                  <strong>${escaparHtml(t.titulo)}</strong>
                  <span class="treinamento-descricao">${escaparHtml(t.descricao)}</span>
                  <span class="treinamento-conclusao">
                    ${barraProgresso(porcentagem(feitos, pessoas.length), 'verde')}
                    <small>${pessoas.length ? `${feitos} de ${pessoas.length} concluíram` : 'Ninguém em acompanhamento chegou nesta fase'}${atrasados ? ` · <span class="texto-alerta">${atrasados} ${atrasados === 1 ? 'atrasado' : 'atrasados'}</span>` : ''}</small>
                  </span>
                </span>
                <span class="treinamento-acoes">
                  <a class="btn btn-secundario btn-pequeno" href="treinamento.html?id=${t.id}">${icone('olho')}Ver</a>
                  <button class="btn-fechar" data-remover="${t.id}" aria-label="Remover ${escaparHtml(t.titulo)}">${icone('lixeira')}</button>
                </span>
              </article>`;
          }).join('')}
        </div>` : '<p class="texto-vazio">Nenhum treinamento nesta fase.</p>'}`;
    }).join('')}`;
}

// formulário

function formatoSelecionado() {
  return document.querySelector('input[name="formato"]:checked').value;
}

function atualizarCamposDoFormato() {
  const regra = REGRAS_FORMATO[formatoSelecionado()];
  const arquivo = document.getElementById('arquivoTreinamento');
  document.getElementById('campoArquivo').hidden = !regra.aceita;
  arquivo.accept = regra.aceita || '';
  arquivo.value = '';
  document.getElementById('nomeArquivo').textContent = 'Clique para escolher um arquivo';
  document.getElementById('dicaArquivo').textContent = regra.dica;
  document.getElementById('rotuloLink').textContent = regra.link;
}

function abrirFormulario() {
  const formulario = document.getElementById('formTreinamento');
  formulario.reset();
  document.getElementById('opcoesFormato').innerHTML = Object.entries(FORMATOS_TREINAMENTO).map(([id, f], i) => `
    <label class="opcao-formato">
      <input type="radio" name="formato" value="${id}" ${i === 0 ? 'checked' : ''}>
      <span>${icone(f.icone)}${f.nome}</span>
    </label>`).join('');
  document.getElementById('faseTreinamento').innerHTML = fasesComPeriodo(dados)
    .map((f) => `<option value="${f.id}">Fase ${f.indice + 1} · ${f.nome}</option>`).join('');
  document.getElementById('erroTreinamento').hidden = true;
  atualizarCamposDoFormato();
  document.getElementById('modalTreinamento').showModal();
}

function mostrarErro(texto) {
  const erro = document.getElementById('erroTreinamento');
  erro.textContent = texto;
  erro.hidden = false;
}

async function publicar(evento) {
  evento.preventDefault();
  const formulario = evento.target;
  const formato = formatoSelecionado();
  const arquivo = formulario.arquivo.files[0];
  const link = formulario.link.value.trim();

  if (!arquivo && !link) {
    mostrarErro(formato === 'link' ? 'Cole o link do treinamento.' : 'Escolha um arquivo ou cole um link.');
    return;
  }

  const botao = document.getElementById('salvarTreinamento');
  botao.disabled = true;
  botao.textContent = 'Publicando…';

  let fonte;
  try {
    if (arquivo) {
      fonte = { tipo: 'arquivo', arquivoId: await salvarArquivo(arquivo), nomeArquivo: arquivo.name };
    } else if (idDoYoutube(link)) {
      fonte = { tipo: 'youtube', id: idDoYoutube(link) };
    } else {
      fonte = { tipo: 'url', url: link };
    }
  } catch (erro) {
    mostrarErro('Não foi possível salvar o arquivo. Tente um arquivo menor ou use um link.');
    botao.disabled = false;
    botao.textContent = 'Publicar treinamento';
    return;
  }

  const treinamento = {
    id: novoId('tr'), titulo: formulario.titulo.value.trim(), descricao: formulario.descricao.value.trim(),
    formato: fonte.tipo === 'youtube' ? 'video' : formato, faseId: formulario.fase.value,
    obrigatorio: formulario.obrigatorio.checked, fonte, criadoEm: dataISO(),
  };
  dados.treinamentos.push(treinamento);

  // avisa quem já tem o treinamento liberado
  dados.colaboradores.forEach((c) => {
    const info = treinamentosDaPessoa(dados, c).find((t) => t.id === treinamento.id);
    if (info.liberado && !situacaoNaJornada(dados, c).concluido) {
      notificar(dados, c.id, `Novo treinamento disponível: ${treinamento.titulo}.`, `treinamento.html?id=${treinamento.id}`);
    }
  });

  salvarDados(dados);
  botao.disabled = false;
  botao.textContent = 'Publicar treinamento';
  document.getElementById('modalTreinamento').close();
  renderizar();
  mostrarAviso('Treinamento publicado.');
}

function iniciar() {
  if (!sessao) return;
  renderizarIcones();
  montarLayout({ dados, perfil: 'gestor', pagina: 'treinamentos' });
  renderizar();

  pagina.addEventListener('click', (evento) => {
    if (evento.target.closest('[data-novo-treinamento]')) abrirFormulario();
    const remover = evento.target.closest('[data-remover]');
    if (remover) {
      idParaRemover = remover.dataset.remover;
      const treinamento = dados.treinamentos.find((t) => t.id === idParaRemover);
      document.getElementById('textoRemover').textContent = `"${treinamento.titulo}" deixa de aparecer para todos os colaboradores.`;
      document.getElementById('modalRemover').showModal();
    }
  });

  document.getElementById('confirmarRemover').addEventListener('click', () => {
    const treinamento = dados.treinamentos.find((t) => t.id === idParaRemover);
    if (treinamento.fonte.tipo === 'arquivo') removerArquivo(treinamento.fonte.arquivoId);
    dados.treinamentos = dados.treinamentos.filter((t) => t.id !== idParaRemover);
    // a IA também deixa de consultar o treinamento removido
    dados.empresa.documentos = dados.empresa.documentos.filter((d) => d.treinamentoId !== idParaRemover);
    salvarDados(dados);
    document.getElementById('modalRemover').close();
    renderizar();
    mostrarAviso('Treinamento removido.', 'lixeira');
  });

  document.getElementById('formTreinamento').addEventListener('change', (evento) => {
    if (evento.target.name === 'formato') atualizarCamposDoFormato();
    if (evento.target.name === 'arquivo') {
      const arquivo = evento.target.files[0];
      document.getElementById('nomeArquivo').textContent = arquivo ? arquivo.name : 'Clique para escolher um arquivo';
    }
  });
  document.getElementById('formTreinamento').addEventListener('submit', publicar);
}

iniciar();
