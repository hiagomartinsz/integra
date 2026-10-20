// manda pro /api/ia (Gemini). se não responder, usa o modo simulado por palavras-chave

// o catálogo de cursos (dados.empresa.temas), as informações e os documentos
// ficam em dados.empresa, o gestor edita tudo na tela "Informações da empresa"

const PALAVRAS_VAZIAS = ['para', 'como', 'sobre', 'pelo', 'pela', 'entre', 'quando', 'onde'];

// palavras-chave do modo simulado, tiradas de um texto. ex: "Férias e folgas" -> ['ferias', 'folga']
function palavrasDoAssunto(assunto) {
  return normalizar(assunto).split(/[^a-z0-9]+/)
    .filter((p) => p.length >= 4 && !PALAVRAS_VAZIAS.includes(p))
    // "folgas" também deve achar "folga"
    .map((p) => (p.endsWith('s') ? p.slice(0, -1) : p));
}

function buscarTema(dados, temaId) {
  return dados.empresa.temas.find((t) => t.id === temaId) || null;
}

// escolhe cursos do tema que a pessoa ainda não recebeu, respeitando o nível pedido
function escolherCursos(tema, texto, jaRecomendados, quantidade) {
  const querAvancado = /(procv|tabela dinamica|avancad|ja sei o basico)/.test(texto);
  const ordemNiveis = querAvancado ? ['intermediario', 'avancado', 'basico'] : ['basico', 'intermediario', 'avancado'];
  return tema.cursos
    .filter((c) => !jaRecomendados.includes(c.videoId))
    .sort((a, b) => ordemNiveis.indexOf(a.nivel) - ordemNiveis.indexOf(b.nivel))
    .slice(0, quantidade);
}

// analisa o texto de um registro com a IA
// retorna: { temaId, mensagem, cursos: [...], semResultado, faltaInformacao, perguntaParaGestor }
async function analisarRegistro(texto, jaRecomendados, colaborador, empresa) {
  try {
    const resposta = await fetch('/api/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(120000),
      body: JSON.stringify({
        texto,
        jaRecomendados,
        catalogo: empresa.temas.map(({ id, nome, cursos }) => ({ id, nome, cursos })),
        perguntasFrequentes: empresa.informacoes.map(({ assunto, resposta }) => ({ assunto, resposta })),
        documentos: empresa.documentos.map(({ nome, texto: conteudo }) => ({ nome, texto: conteudo })),
        colaborador: { primeiroNome: primeiroNome(colaborador.nome), cargo: colaborador.cargo },
      }),
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const analise = await resposta.json();
    const tema = empresa.temas.find((t) => t.id === analise.temaId);
    return {
      temaId: tema ? tema.id : null,
      mensagem: analise.mensagem,
      semResultado: Boolean(analise.semResultado),
      faltaInformacao: Boolean(analise.faltaInformacao && analise.perguntaParaGestor),
      perguntaParaGestor: analise.perguntaParaGestor || '',
      cursos: tema ? analise.cursos.map((id) => tema.cursos.find((c) => c.videoId === id)).filter(Boolean) : [],
    };
  } catch (erro) {
    console.warn('IA indisponível, usando o modo simulado:', erro.message);
    return analisarRegistroSimulado(texto, jaRecomendados, empresa);
  }
}

// modo simulado: análise por palavras-chave, usada quando o servidor da IA não responde
// responde só com as informações cadastradas (não lê os documentos)
function analisarRegistroSimulado(texto, jaRecomendados, empresa) {
  const normalizado = normalizar(texto);

  let tema = null;
  let maior = 0;
  empresa.temas.forEach((t) => {
    const palavras = [...(t.palavras || []), ...palavrasDoAssunto(t.nome)];
    const pontos = palavras.filter((p) => normalizado.includes(p)).length;
    if (pontos > maior && t.cursos.length) { tema = t; maior = pontos; }
  });

  // a informação com mais palavras do assunto presentes no texto
  let faq = null;
  let melhor = 0;
  empresa.informacoes.forEach((f) => {
    if (!f.resposta.trim()) return;
    const pontos = palavrasDoAssunto(f.assunto).filter((p) => normalizado.includes(p)).length;
    if (pontos > melhor) { faq = f; melhor = pontos; }
  });
  const base = { faltaInformacao: false, perguntaParaGestor: '' };

  if (tema) {
    const cursos = escolherCursos(tema, normalizado, jaRecomendados, 2);
    if (!cursos.length) {
      return {
        ...base, temaId: tema.id, cursos: [], semResultado: true,
        mensagem: `Identifiquei uma dificuldade com ${tema.nome.toLowerCase()}, mas você já recebeu todos os cursos que tenho sobre isso. Que tal pedir ajuda ao seu gestor?`,
      };
    }
    const quantidade = cursos.length === 1 ? 'um curso gratuito' : `${cursos.length} cursos gratuitos`;
    return {
      ...base, temaId: tema.id, cursos, semResultado: false,
      mensagem: `Identifiquei uma dificuldade com ${tema.nome.toLowerCase()}. Separei ${quantidade} para você: comece por "${cursos[0].titulo}". Depois de assistir, conte se ajudou.`,
    };
  }

  if (faq) return { ...base, temaId: null, cursos: [], semResultado: false, mensagem: faq.resposta };

  return {
    ...base, temaId: null, cursos: [], semResultado: true,
    mensagem: 'Não consegui identificar o assunto nem um curso adequado. Você pode reescrever com mais detalhes ou enviar para o seu gestor.',
  };
}

// quando um curso não ajudou: próximo curso do mesmo tema, se houver
function proximoCursoDoTema(dados, temaId, jaRecomendados) {
  const tema = buscarTema(dados, temaId);
  if (!tema) return null;
  return escolherCursos(tema, '', jaRecomendados, 1)[0] || null;
}
