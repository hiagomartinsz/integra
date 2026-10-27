// tudo passa por aqui. hoje salva no localStorage; quando tiver back-end
// é só trocar carregarDados() e salvarDados()

const CHAVE_STORAGE = 'integra-dados-v3';
const CHAVE_SESSAO = 'integra-sessao';
const ID_GESTOR = 'gestor';

// funcionalidades que a empresa pode ligar em cada fase
const MODULOS = {
  funcoes: {
    nome: 'Minhas funções',
    descricao: 'Apresenta as responsabilidades do cargo, definidas pelo gestor.',
    icone: 'maleta',
  },
  checklist: {
    nome: 'Checklist de rotina',
    descricao: 'Tarefas diárias e pontuais atribuídas pelo gestor.',
    icone: 'lista',
  },
  duvidas: {
    nome: 'Dúvidas e dificuldades',
    descricao: 'Espaço para registrar dúvidas: só para si, para o gestor ou para a IA, que recomenda cursos.',
    icone: 'ajuda',
  },
  checkin: {
    nome: 'Check-in de adaptação',
    descricao: 'Uma vez por semana, a pessoa conta como está se sentindo na empresa.',
    icone: 'coracao',
  },
};

const FORMATOS_TREINAMENTO = {
  pdf: { nome: 'PDF', icone: 'arquivo' },
  video: { nome: 'Vídeo', icone: 'play' },
  slides: { nome: 'Apresentação', icone: 'slides' },
  link: { nome: 'Link externo', icone: 'link' },
};

// datas

function dataISO(data = new Date()) {
  const doisDigitos = (n) => String(n).padStart(2, '0');
  return `${data.getFullYear()}-${doisDigitos(data.getMonth() + 1)}-${doisDigitos(data.getDate())}`;
}

function somarDias(iso, dias) {
  const data = new Date(iso + 'T00:00:00');
  data.setDate(data.getDate() + dias);
  return dataISO(data);
}

function diasAPartirDeHoje(dias) {
  return somarDias(dataISO(), dias);
}

// diferença em dias entre duas datas aaaa-mm-dd (b - a)
function diferencaEmDias(a, b) {
  return Math.round((new Date(b + 'T00:00:00') - new Date(a + 'T00:00:00')) / 86400000);
}

function horasAtras(horas) {
  return new Date(Date.now() - horas * 3600 * 1000).toISOString();
}

// dados iniciais (exemplo)

// gera um histórico de rotina: marca os dias feitos com a "assiduidade" informada
function historicoDeRotina(inicioISO, assiduidade, semente) {
  const feitas = [];
  const primeiro = Math.max(1, diferencaEmDias(inicioISO, diasAPartirDeHoje(-10)));
  const ontem = diferencaEmDias(inicioISO, diasAPartirDeHoje(-1));
  for (let d = primeiro; d <= ontem; d++) {
    const pseudoAleatorio = ((d * 37 + semente * 17) % 100) / 100;
    if (pseudoAleatorio < assiduidade) feitas.push(somarDias(inicioISO, d));
  }
  return feitas;
}

function rotina(id, titulo, inicio, assiduidade, semente, feitaHoje = false) {
  const feitas = historicoDeRotina(inicio, assiduidade, semente);
  if (feitaHoje) feitas.push(dataISO());
  return { id, titulo, tipo: 'rotina', criadaEm: somarDias(inicio, 1), feitas };
}

function pontual(id, titulo, prazoEmDias, concluidaHaDias = null) {
  return {
    id, titulo, tipo: 'pontual', prazo: diasAPartirDeHoje(prazoEmDias), criadaEm: diasAPartirDeHoje(-3),
    concluidaEm: concluidaHaDias === null ? null : diasAPartirDeHoje(-concluidaHaDias),
  };
}

// catálogo de cursos externos gratuitos que a IA recomenda, por tema
// o gestor edita na tela "Informações da empresa"
function criarCatalogoInicial() {
  return [
    {
      id: 'planilhas', nome: 'Planilhas (Excel)',
      palavras: ['planilha', 'excel', 'procv', 'tabela dinamica', 'formula', 'sheets', 'grafico'],
      cursos: [
        { titulo: 'Curso Excel Básico Aula 01', canal: 'Lopes Edutech', videoId: 'yvginOTBQDA', nivel: 'basico' },
        { titulo: 'Excel do zero para iniciantes - Aula 01', canal: 'A Dica da Vez', videoId: 'uXT--N4UPi0', nivel: 'basico' },
        { titulo: 'Como Usar PROCV - Excel para Iniciantes', canal: 'Curso de Excel Online', videoId: 'RNlcINvFcWY', nivel: 'intermediario' },
        { titulo: 'Tabela Dinâmica no Excel - Aula Completa', canal: 'Grupo Ninja', videoId: 'FddIVxGAO60', nivel: 'avancado' },
        { titulo: 'Aula completa para aprender tudo de PROCV', canal: 'Doutores do Excel', videoId: 'UT_9jtvtZOo', nivel: 'avancado' },
      ],
    },
    {
      id: 'apresentacoes', nome: 'Apresentações (PowerPoint)',
      palavras: ['powerpoint', 'power point', 'slide'],
      cursos: [
        { titulo: 'Curso de PowerPoint - Aula 1: Primeiros Passos', canal: 'Giovani Toreli', videoId: 'lyRb_O_6u5c', nivel: 'basico' },
        { titulo: 'Aula Completa de PowerPoint do Zero à Apresentação', canal: 'Expert Cursos', videoId: 'KUpH10BMKQE', nivel: 'intermediario' },
        { titulo: 'Curso Completo de PowerPoint para Iniciantes – Aula 01', canal: 'Jhonny Lopes', videoId: 'ynBE_3iFI6Q', nivel: 'basico' },
      ],
    },
    {
      id: 'falar-em-publico', nome: 'Falar em público',
      palavras: ['falar em publico', 'nervos', 'apresentar', 'timid', 'vergonha', 'medo de falar', 'oratoria', 'reuniao', 'reunioes'],
      cursos: [
        { titulo: 'Como driblar o nervosismo na hora de falar em público', canal: 'Tudo Sem Firulas', videoId: 'bnARXvWA_zI', nivel: 'basico' },
        { titulo: '3 exercícios para ter mais segurança ao falar em público', canal: 'ÓHQUEMFALA!', videoId: 'jfbFKSbhqCU', nivel: 'basico' },
        { titulo: 'Vença o medo de falar em público! Dicas de oratória', canal: 'Frons Educação', videoId: 'zHgaDwaq0cM', nivel: 'intermediario' },
      ],
    },
    {
      id: 'comunicacao', nome: 'Comunicação no trabalho',
      palavras: ['comunica', 'me expressar', 'feedback', 'conflito', 'assertiv', 'dizer nao', 'colegas'],
      cursos: [
        { titulo: '10 técnicas de comunicação assertiva', canal: 'ÓHQUEMFALA!', videoId: '2LABVbAgStA', nivel: 'basico' },
        { titulo: 'Três dicas para ser mais assertivo no trabalho', canal: 'IOB', videoId: '5uXBzsW4mTM', nivel: 'basico' },
        { titulo: 'Comunicação assertiva no trabalho: evite estas frases', canal: 'Vânia Marques', videoId: 'PuOMxWMaaMI', nivel: 'intermediario' },
      ],
    },
    {
      id: 'tempo', nome: 'Organização do tempo',
      palavras: ['tempo', 'organiz', 'prioridade', 'procrastin', 'foco', 'produtiv', 'demandas', 'prazo', 'sobrecarreg'],
      cursos: [
        { titulo: 'Técnica Pomodoro para produtividade', canal: 'Trello Brasil', videoId: 'yZCVO0cvLU8', nivel: 'basico' },
        { titulo: 'Como ter mais foco nas suas tarefas? Técnica Pomodoro', canal: 'João Vitor Ortiz', videoId: '8Adggs1k2JY', nivel: 'basico' },
        { titulo: 'Como usar a técnica Pomodoro [guia rápido]', canal: 'João Pessutto', videoId: 'sPutxNr8NCQ', nivel: 'basico' },
      ],
    },
    {
      id: 'seguranca', nome: 'Segurança digital',
      palavras: ['seguranca', 'senha', 'phishing', 'golpe', 'hacker', 'virus', 'vpn'],
      cursos: [
        { titulo: 'Phishing: o que é e como se proteger', canal: 'Meu Digio', videoId: 'EEvJrsKsEIg', nivel: 'basico' },
        { titulo: 'Phishing: saiba como não ser fisgado por esse golpe', canal: 'Banco PAN', videoId: 'TFDnpgRSPok', nivel: 'basico' },
        { titulo: 'Segurança digital: aprenda a se proteger do phishing', canal: 'Cooperativas Ailos', videoId: 'xMBOQCvvY1k', nivel: 'basico' },
      ],
    },
    {
      id: 'lgpd', nome: 'Privacidade e LGPD',
      palavras: ['lgpd', 'dados pessoais', 'privacidade', 'protecao de dados'],
      cursos: [
        { titulo: 'O que é a Lei Geral de Proteção de Dados?', canal: 'Ministério Público de Rondônia', videoId: 'OIPqTk0fQGs', nivel: 'basico' },
        { titulo: 'LGPD: resumo da lei em 4 minutos', canal: 'ManageEngine Brasil', videoId: 'n3e0HVcNml0', nivel: 'basico' },
        { titulo: '10 princípios da LGPD', canal: 'Ummense', videoId: 'guw1qH2Ex2g', nivel: 'intermediario' },
      ],
    },
    {
      id: 'cultura', nome: 'Adaptação à cultura',
      palavras: ['cultura', 'valores', 'me encaixar', 'adapta', 'pertenc', 'enturmar', 'deslocad'],
      cursos: [
        { titulo: 'O que é cultura organizacional?', canal: 'Voitto', videoId: 'vMPNkvf5CDU', nivel: 'basico' },
        { titulo: 'Cultura organizacional: o que é e como construir', canal: 'Frons Educação', videoId: 'LNAVOe5flnw', nivel: 'basico' },
      ],
    },
  ];
}

// informações da empresa que a IA usa pra responder (tela "Informações da empresa")
function criarEmpresaInicial() {
  return {
    // itens com exemplo: true são de uma empresa fictícia; o guia da tela pede pra trocá-los
    guiaOculto: false,
    temas: criarCatalogoInicial(),
    // perguntas sobre a empresa que a IA não soube responder e o colaborador pediu ao gestor
    perguntasPendentes: [],
    informacoes: [
      { id: 'inf1', exemplo: true, assunto: 'Horário, expediente, ponto e almoço', resposta: 'O expediente é das 9h às 18h, com 1h de almoço. O ponto é registrado pelo app da empresa.' },
      { id: 'inf2', exemplo: true, assunto: 'Férias, folgas e day off', resposta: 'Férias podem ser pedidas depois de 12 meses, pelo portal do RH, com 30 dias de antecedência.' },
      { id: 'inf3', exemplo: true, assunto: 'Benefícios, plano de saúde, vale-refeição', resposta: 'Os benefícios incluem plano de saúde e odontológico, vale-refeição e academias parceiras. Os cartões chegam em até 10 dias úteis.' },
      { id: 'inf4', exemplo: true, assunto: 'Salário, pagamento e holerite', resposta: 'O salário é pago no 5º dia útil. O holerite fica no portal do RH, em "Meus documentos".' },
      { id: 'inf5', exemplo: true, assunto: 'Reembolso de despesas e nota fiscal', resposta: 'Despesas de trabalho são reembolsadas pelo portal financeiro, com a nota fiscal anexada em até 30 dias.' },
    ],
    // texto extraído dos documentos que a IA consulta (treinamentos ou arquivos avulsos)
    documentos: [
      {
        id: 'doc1', exemplo: true, nome: 'Treinamento admissional', origem: 'treinamento', treinamentoId: 'tr1', adicionadoEm: diasAPartirDeHoje(-120),
        texto: `Treinamento Admissional — Tudo o que você precisa saber no seu primeiro dia: quem somos, como trabalhamos e quais são as regras da casa. Material interno · Versão 2026

1. Boas-vindas
Que bom ter você aqui! Este material apresenta a empresa e os combinados básicos para os seus primeiros dias. Leia com calma: as dúvidas que surgirem podem ser registradas na plataforma a partir da sua segunda fase.
Quem somos: Somos uma empresa de tecnologia que desenvolve soluções para gestão de pessoas. Hoje atendemos mais de 300 clientes no Brasil, com um time de 180 pessoas distribuídas entre São Paulo, Recife e trabalho remoto.
Missão: fazer cada pessoa que chega se sentir parte do time desde o primeiro dia.
Visão: ser a empresa onde as pessoas mais aprendem e crescem no país.
Valores: clareza acima de tudo, aprender em público, dono do resultado e gente antes de processo.
Seu gestor direto é a primeira pessoa a procurar para qualquer dúvida sobre o trabalho. Para assuntos de benefícios e documentos, fale com o time de Pessoas.

2. Como trabalhamos
Jornada e ponto: O expediente é das 9h às 18h, com 1h de almoço. O ponto é registrado pelo aplicativo da empresa na chegada, na saída e nos intervalos.
Rituais do time:
- Daily: todos os dias, 15 min. Para alinhar o que cada um está fazendo e destravar problemas.
- 1:1 com o gestor: semanal no onboarding. Para feedback, dúvidas e acompanhamento da adaptação.
- Retrospectiva: a cada 15 dias. Para decidir o que manter e o que melhorar.
Ferramentas: e-mail e agenda corporativos; chat interno para conversas rápidas com o time; quadro de tarefas para acompanhar as entregas; Drive da empresa para documentos compartilhados.

3. Regras da casa
Segurança da informação: ative a verificação em duas etapas no e-mail e no chat no primeiro dia. Nunca compartilhe sua senha, nem com o time de TI. Fora do escritório, use sempre a VPN para acessar sistemas internos.
Dados pessoais (LGPD): dados de clientes e colegas só podem ser usados para a finalidade de trabalho e circulam apenas pelos canais oficiais. Na dúvida, procure o Encarregado de Dados.
Conduta: respeito é inegociável. Situações de assédio ou discriminação podem ser relatadas, de forma anônima, pelo canal de ética.
Próximos passos: marque este treinamento como concluído na plataforma e confira, na tela inicial, as funções que seu gestor definiu para você.`,
      },
    ],
  };
}

// dados salvos antes do guia: marca como exemplo o que continua igual ao pré-definido
function marcarExemplos(empresa, inicial) {
  const igual = (lista, item, campo) => lista.some((original) => original.id === item.id && original[campo] === item[campo]);
  (empresa.informacoes || []).forEach((i) => { if (igual(inicial.informacoes, i, 'resposta')) i.exemplo = true; });
  (empresa.documentos || []).forEach((d) => { if (igual(inicial.documentos, d, 'texto')) d.exemplo = true; });
}

function criarDadosIniciais() {
  const inicio = {
    marina: diasAPartirDeHoje(-11), // dia 12 -> Fase 2
    lucas: diasAPartirDeHoje(0), // dia 1 -> Fase 0
    juliana: diasAPartirDeHoje(-3), // dia 4 -> Fase 1
    carlos: diasAPartirDeHoje(-19), // dia 20 -> Fase 2
    rodrigo: diasAPartirDeHoje(-44), // dia 45 -> Fase 3
    fernanda: diasAPartirDeHoje(-96), // terminou o programa
  };

  return {
    gestor: { nome: 'Ricardo Melo', cargo: 'Diretor de Operações' },

    // fases da jornada, a empresa configura na tela "Fases da jornada"
    fases: [
      { id: 'f0', nome: 'Primeiro Dia', dias: 1, objetivo: 'Receber a pessoa, apresentar a empresa e deixar claro o que se espera dela.', modulos: ['funcoes'] },
      { id: 'f1', nome: 'Primeira Semana', dias: 6, objetivo: 'Criar a rotina de trabalho e conhecer as ferramentas do dia a dia.', modulos: ['funcoes', 'checklist'] },
      { id: 'f2', nome: 'Primeiro Mês', dias: 23, objetivo: 'Ganhar autonomia e tratar as primeiras dúvidas e dificuldades.', modulos: ['checklist', 'duvidas'] },
      { id: 'f3', nome: 'Até o 3º Mês', dias: 60, objetivo: 'Consolidar a integração e acompanhar a adaptação até o fim do programa.', modulos: ['checklist', 'duvidas', 'checkin'] },
    ],

    // treinamentos enviados pela empresa, liberados a partir de uma fase
    treinamentos: [
      {
        id: 'tr1', titulo: 'Treinamento admissional', formato: 'pdf', faseId: 'f0', obrigatorio: true,
        descricao: 'Quem somos, como trabalhamos e as regras da casa. Leitura de cerca de 15 minutos.',
        fonte: { tipo: 'url', url: 'assets/exemplos/treinamento-admissional.pdf', nomeArquivo: 'treinamento-admissional.pdf' },
        criadoEm: diasAPartirDeHoje(-120),
      },
      {
        id: 'tr2', titulo: 'Vídeo de boas-vindas: nossa cultura', formato: 'video', faseId: 'f0', obrigatorio: true,
        descricao: 'Um panorama sobre cultura organizacional e como ela aparece no dia a dia do time.',
        fonte: { tipo: 'youtube', id: 'vMPNkvf5CDU' },
        criadoEm: diasAPartirDeHoje(-120),
      },
      {
        id: 'tr3', titulo: 'Segurança da informação', formato: 'slides', faseId: 'f1', obrigatorio: true,
        descricao: 'Os 5 hábitos que protegem você e a empresa contra golpes e vazamentos.',
        fonte: { tipo: 'url', url: 'assets/exemplos/seguranca-da-informacao.pdf', nomeArquivo: 'seguranca-da-informacao.pdf' },
        criadoEm: diasAPartirDeHoje(-120),
      },
      {
        id: 'tr4', titulo: 'LGPD na prática', formato: 'video', faseId: 'f2', obrigatorio: false,
        descricao: 'O que a Lei Geral de Proteção de Dados muda no seu trabalho.',
        fonte: { tipo: 'youtube', id: 'OIPqTk0fQGs' },
        criadoEm: diasAPartirDeHoje(-60),
      },
    ],

    empresa: criarEmpresaInicial(),

    colaboradores: [
      {
        id: 'marina', nome: 'Marina Santos', cargo: 'Product Designer', inicio: inicio.marina,
        funcoes: [
          { id: 'fn1', titulo: 'Pesquisa com usuários', descricao: 'Planejar e conduzir entrevistas e testes de usabilidade com clientes.' },
          { id: 'fn2', titulo: 'Protótipos e interfaces', descricao: 'Criar fluxos, wireframes e protótipos no Figma para as squads de produto.' },
          { id: 'fn3', titulo: 'Sistema de design', descricao: 'Manter a biblioteca de componentes atualizada junto com o time de front-end.' },
        ],
        funcoesConfirmadasEm: somarDias(inicio.marina, 0),
        treinamentosConcluidos: { tr1: somarDias(inicio.marina, 0), tr2: somarDias(inicio.marina, 0), tr3: somarDias(inicio.marina, 2) },
        tarefas: [
          rotina('m1', 'Participar da daily às 9h30', inicio.marina, 0.9, 1, true),
          rotina('m2', 'Responder mensagens e e-mails do time', inicio.marina, 0.8, 2, true),
          rotina('m3', 'Atualizar o quadro de tarefas', inicio.marina, 0.7, 3),
          pontual('m4', 'Revisar o protótipo do app com a squad', 2),
          pontual('m5', 'Enviar o formulário de feedback do onboarding', 0),
          pontual('m6', 'Configurar acesso ao Figma da empresa', -8, 8),
        ],
        registros: [
          {
            id: 'r1', texto: 'Tenho dificuldade com planilhas. Preciso consolidar os resultados das pesquisas no Excel e demoro muito.',
            destino: 'ia', data: horasAtras(70),
            analise: { temaId: 'planilhas', mensagem: 'Identifiquei uma dificuldade com planilhas (Excel). Separei dois cursos gratuitos: comece pelo básico e depois aprenda o PROCV, que vai acelerar a consolidação das pesquisas.' },
            resolvida: false,
          },
          {
            id: 'r2', texto: 'Qual é o processo para pedir acesso ao ambiente de testes do app?',
            destino: 'gestor', data: horasAtras(50),
            resposta: { texto: 'Abra um chamado no Portal de TI na categoria "Acessos" e me marque como aprovador. Em até 1 dia útil sai.', data: horasAtras(46) },
          },
          {
            id: 'r3', texto: 'Lembrar de pedir para participar das entrevistas com clientes da próxima sprint.',
            destino: 'pessoal', data: horasAtras(26),
          },
        ],
        cursos: [
          { id: 'cm1', titulo: 'Curso Excel Básico Aula 01', canal: 'Lopes Edutech', videoId: 'yvginOTBQDA', temaId: 'planilhas', origem: 'ia', registroId: 'r1', status: 'concluido', sugeridoEm: horasAtras(70), iniciadoEm: horasAtras(68), concluidoEm: horasAtras(30), ajudou: null },
          { id: 'cm2', titulo: 'Como Usar PROCV - Excel para Iniciantes', canal: 'Curso de Excel Online', videoId: 'RNlcINvFcWY', temaId: 'planilhas', origem: 'ia', registroId: 'r1', status: 'sugerido', sugeridoEm: horasAtras(70), iniciadoEm: null, concluidoEm: null, ajudou: null },
        ],
        checkins: [],
      },
      {
        id: 'lucas', nome: 'Lucas Oliveira', cargo: 'Assistente Comercial', inicio: inicio.lucas,
        funcoes: [
          { id: 'fn1', titulo: 'Atendimento a leads', descricao: 'Responder os contatos que chegam pelo site em até 2 horas úteis.' },
          { id: 'fn2', titulo: 'CRM atualizado', descricao: 'Registrar cada conversa e próximo passo no CRM no mesmo dia.' },
        ],
        funcoesConfirmadasEm: null,
        treinamentosConcluidos: {},
        tarefas: [
          rotina('l1', 'Responder novos leads do site', inicio.lucas, 0, 4),
          rotina('l2', 'Atualizar o CRM no fim do dia', inicio.lucas, 0, 5),
        ],
        registros: [], cursos: [], checkins: [],
      },
      {
        id: 'juliana', nome: 'Juliana Silva', cargo: 'Desenvolvedora Front-end', inicio: inicio.juliana,
        funcoes: [
          { id: 'fn1', titulo: 'Desenvolvimento de telas', descricao: 'Implementar as interfaces do app a partir dos protótipos do time de design.' },
          { id: 'fn2', titulo: 'Revisão de código', descricao: 'Revisar pelo menos dois pull requests do time por dia.' },
        ],
        funcoesConfirmadasEm: somarDias(inicio.juliana, 0),
        treinamentosConcluidos: { tr1: somarDias(inicio.juliana, 0), tr2: somarDias(inicio.juliana, 0) },
        tarefas: [
          rotina('j1', 'Participar da daily às 9h30', inicio.juliana, 1, 6, true),
          rotina('j2', 'Revisar pull requests do time', inicio.juliana, 0.6, 7),
          pontual('j3', 'Configurar o ambiente de desenvolvimento', 1),
        ],
        registros: [], cursos: [], checkins: [],
      },
      {
        id: 'carlos', nome: 'Carlos Eduardo', cargo: 'Analista Financeiro', inicio: inicio.carlos,
        funcoes: [
          { id: 'fn1', titulo: 'Contas a pagar', descricao: 'Conferir e programar os pagamentos da semana.' },
          { id: 'fn2', titulo: 'Relatório mensal', descricao: 'Montar o relatório de despesas por área até o 5º dia útil.' },
        ],
        funcoesConfirmadasEm: somarDias(inicio.carlos, 0),
        treinamentosConcluidos: { tr1: somarDias(inicio.carlos, 0), tr2: somarDias(inicio.carlos, 0) },
        tarefas: [
          rotina('c1', 'Conferir pagamentos programados', inicio.carlos, 0.4, 8),
          rotina('c2', 'Conciliar o extrato bancário', inicio.carlos, 0.35, 9),
          pontual('c3', 'Entregar a prévia do relatório mensal', -2),
        ],
        registros: [
          { id: 'r1', texto: 'Posso trabalhar remoto às sextas-feiras? Não encontrei isso no material.', destino: 'gestor', data: horasAtras(20) },
          {
            id: 'r2', texto: 'Fico muito nervoso para apresentar os números nas reuniões com a diretoria.',
            destino: 'ia', data: horasAtras(90),
            analise: { temaId: 'falar-em-publico', mensagem: 'Identifiquei uma dificuldade em falar em público. Separei dois vídeos curtos com exercícios práticos para ganhar segurança nas apresentações.' },
            resolvida: false,
          },
        ],
        cursos: [
          { id: 'cc1', titulo: 'Como driblar o nervosismo na hora de falar em público', canal: 'Tudo Sem Firulas', videoId: 'bnARXvWA_zI', temaId: 'falar-em-publico', origem: 'ia', registroId: 'r2', status: 'andamento', sugeridoEm: horasAtras(90), iniciadoEm: horasAtras(80), concluidoEm: null, ajudou: null },
          { id: 'cc2', titulo: '3 exercícios para ter mais segurança ao falar em público', canal: 'ÓHQUEMFALA!', videoId: 'jfbFKSbhqCU', temaId: 'falar-em-publico', origem: 'ia', registroId: 'r2', status: 'sugerido', sugeridoEm: horasAtras(90), iniciadoEm: null, concluidoEm: null, ajudou: null },
        ],
        checkins: [],
      },
      {
        id: 'rodrigo', nome: 'Rodrigo Souza', cargo: 'Analista de Dados', inicio: inicio.rodrigo,
        funcoes: [
          { id: 'fn1', titulo: 'Dashboards', descricao: 'Manter os painéis de indicadores das áreas atualizados.' },
          { id: 'fn2', titulo: 'Análises sob demanda', descricao: 'Responder às perguntas de negócio das áreas com dados.' },
        ],
        funcoesConfirmadasEm: somarDias(inicio.rodrigo, 0),
        treinamentosConcluidos: { tr1: somarDias(inicio.rodrigo, 0), tr2: somarDias(inicio.rodrigo, 0), tr3: somarDias(inicio.rodrigo, 3), tr4: somarDias(inicio.rodrigo, 12) },
        tarefas: [
          rotina('d1', 'Verificar a carga de dados da madrugada', inicio.rodrigo, 0.95, 10, true),
          rotina('d2', 'Atualizar o painel de vendas', inicio.rodrigo, 0.85, 11),
          pontual('d3', 'Apresentar a análise de churn para a diretoria', 5),
        ],
        registros: [
          {
            id: 'r1', texto: 'Tenho dificuldade em organizar meu tempo com tantas demandas chegando ao mesmo tempo.',
            destino: 'ia', data: horasAtras(24 * 20),
            analise: { temaId: 'tempo', mensagem: 'Identifiquei uma dificuldade com organização do tempo. A técnica Pomodoro é um bom começo para focar em uma demanda por vez.' },
            resolvida: true,
          },
        ],
        cursos: [
          { id: 'cr1', titulo: 'Técnica Pomodoro para produtividade', canal: 'Trello Brasil', videoId: 'yZCVO0cvLU8', temaId: 'tempo', origem: 'ia', registroId: 'r1', status: 'concluido', sugeridoEm: horasAtras(24 * 20), iniciadoEm: horasAtras(24 * 19), concluidoEm: horasAtras(24 * 18), ajudou: true },
        ],
        checkins: [
          { id: 'k1', data: diasAPartirDeHoje(-14), nota: 4, comentario: 'Já me sinto parte do time. As demandas estão mais organizadas.' },
          { id: 'k2', data: diasAPartirDeHoje(-7), nota: 2, comentario: 'Semana pesada: muitas urgências da diretoria e pouco tempo para o painel de vendas.' },
        ],
      },
      {
        id: 'fernanda', nome: 'Fernanda Lima', cargo: 'Analista de RH', inicio: inicio.fernanda,
        funcoes: [{ id: 'fn1', titulo: 'Recrutamento', descricao: 'Conduzir os processos seletivos das áreas de operação.' }],
        funcoesConfirmadasEm: somarDias(inicio.fernanda, 0),
        treinamentosConcluidos: { tr1: somarDias(inicio.fernanda, 0), tr2: somarDias(inicio.fernanda, 0), tr3: somarDias(inicio.fernanda, 2), tr4: somarDias(inicio.fernanda, 10) },
        tarefas: [], registros: [], cursos: [],
        checkins: [
          { id: 'k1', data: somarDias(inicio.fernanda, 40), nota: 4, comentario: 'Tudo bem!' },
          { id: 'k2', data: somarDias(inicio.fernanda, 80), nota: 5, comentario: 'Totalmente integrada ao time.' },
        ],
      },
    ],

    notificacoes: {
      marina: [
        { texto: 'Ricardo Melo respondeu sua dúvida sobre o ambiente de testes.', data: horasAtras(46), lida: false, link: 'duvidas.html' },
        { texto: 'Nova tarefa: Revisar o protótipo do app com a squad.', data: horasAtras(30), lida: false, link: 'colaborador.html#checklist' },
      ],
      [ID_GESTOR]: [
        { texto: 'Carlos Eduardo enviou uma dúvida para você.', data: horasAtras(20), lida: false, link: 'pessoa.html?id=carlos#duvidas' },
        { texto: 'Rodrigo Souza avaliou a semana com nota 2 no check-in.', data: horasAtras(24 * 7), lida: false, link: 'pessoa.html?id=rodrigo#checkins' },
        { texto: 'Lucas Oliveira começa hoje. As funções dele já estão definidas.', data: horasAtras(2), lida: false, link: 'pessoa.html?id=lucas' },
      ],
    },
  };
}

// salvar e carregar

function carregarDados() {
  // abrir qualquer página com ?reset volta aos dados iniciais
  const parametros = new URLSearchParams(location.search);
  if (parametros.has('reset')) {
    resetarDados();
    parametros.delete('reset');
    const busca = parametros.toString();
    history.replaceState(null, '', location.pathname + (busca ? `?${busca}` : '') + location.hash);
  }

  try {
    const salvo = localStorage.getItem(CHAVE_STORAGE);
    if (salvo) {
      const dados = JSON.parse(salvo);
      // dados salvos antes da tela "Informações da empresa" (ou de partes dela)
      const empresaInicial = criarEmpresaInicial();
      if (dados.empresa && !('guiaOculto' in dados.empresa)) marcarExemplos(dados.empresa, empresaInicial);
      dados.empresa = { ...empresaInicial, ...dados.empresa };
      return dados;
    }
  } catch (erro) {
    console.warn('Não foi possível ler os dados salvos.', erro);
  }
  return criarDadosIniciais();
}

function salvarDados(dados) {
  try {
    localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
  } catch (erro) {
    console.warn('Não foi possível salvar os dados.', erro);
  }
}

function resetarDados() {
  try {
    localStorage.removeItem(CHAVE_STORAGE);
  } catch (erro) {
    console.warn('Não foi possível apagar os dados.', erro);
  }
}

// sessão (quem está usando o sistema)

function obterSessao() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_SESSAO));
  } catch (erro) {
    return null;
  }
}

function iniciarSessao(perfil, id) {
  try {
    localStorage.setItem(CHAVE_SESSAO, JSON.stringify({ perfil, id }));
  } catch (erro) {
    console.warn('Não foi possível iniciar a sessão.', erro);
  }
}

function encerrarSessao() {
  try {
    localStorage.removeItem(CHAVE_SESSAO);
  } catch (erro) {
    console.warn('Não foi possível encerrar a sessão.', erro);
  }
}

// garante que a página só abre pro perfil certo; senão volta ao login
function exigirSessao(dados, perfil) {
  const sessao = obterSessao();
  const valida = sessao && sessao.perfil === perfil
    && (perfil === 'gestor' || dados.colaboradores.some((c) => c.id === sessao.id));
  if (!valida) {
    location.replace('index.html');
    return null;
  }
  return sessao;
}

// jornada: em que dia e fase a pessoa está

function duracaoDoPrograma(dados) {
  return dados.fases.reduce((soma, fase) => soma + fase.dias, 0);
}

// fases com o dia em que começam e terminam (1 = primeiro dia na empresa)
function fasesComPeriodo(dados) {
  let dia = 1;
  return dados.fases.map((fase, indice) => {
    const periodo = { ...fase, indice, inicioDia: dia, fimDia: dia + fase.dias - 1 };
    dia += fase.dias;
    return periodo;
  });
}

function textoDoPeriodo(fase) {
  return fase.inicioDia === fase.fimDia ? `Dia ${fase.inicioDia}` : `Dias ${fase.inicioDia} a ${fase.fimDia}`;
}

function diaNaEmpresa(colaborador) {
  return diferencaEmDias(colaborador.inicio, dataISO()) + 1;
}

function situacaoNaJornada(dados, colaborador) {
  const fases = fasesComPeriodo(dados);
  const dia = diaNaEmpresa(colaborador);
  const duracao = duracaoDoPrograma(dados);
  const concluido = dia > duracao;
  const naoComecou = dia < 1;
  const fase = concluido ? fases[fases.length - 1] : fases.find((f) => dia >= f.inicioDia && dia <= f.fimDia) || fases[0];

  return {
    dia: Math.max(dia, 0),
    duracao,
    concluido,
    naoComecou,
    fases,
    fase,
    diasRestantesNaFase: concluido ? 0 : fase.fimDia - dia + 1,
    progresso: Math.min(100, Math.max(0, Math.round((Math.min(dia, duracao) / duracao) * 100))),
  };
}

// módulo ligado na fase atual da pessoa?
function moduloAtivo(dados, colaborador, modulo) {
  const situacao = situacaoNaJornada(dados, colaborador);
  return !situacao.concluido && !situacao.naoComecou && situacao.fase.modulos.includes(modulo);
}

// a partir de qual fase o módulo aparece (para mostrar "disponível na Fase X")
function primeiraFaseComModulo(dados, modulo) {
  return fasesComPeriodo(dados).find((f) => f.modulos.includes(modulo)) || null;
}

// treinamentos

function treinamentosDaPessoa(dados, colaborador) {
  const situacao = situacaoNaJornada(dados, colaborador);
  return dados.treinamentos.map((treinamento) => {
    const fase = situacao.fases.find((f) => f.id === treinamento.faseId) || situacao.fases[0];
    const liberado = situacao.concluido || situacao.dia >= fase.inicioDia;
    const concluidoEm = colaborador.treinamentosConcluidos[treinamento.id] || null;
    // só conta como atraso se o treinamento já existia quando a fase da pessoa terminou
    const fimDaFase = somarDias(colaborador.inicio, fase.fimDia - 1);
    const atrasado = treinamento.obrigatorio && !concluidoEm && situacao.dia > fase.fimDia && treinamento.criadoEm <= fimDaFase;
    return { ...treinamento, fase, liberado, concluidoEm, atrasado, liberaEm: somarDias(colaborador.inicio, fase.inicioDia - 1) };
  });
}

// checklist

// dias da semana no padrão do Date.getDay() (0 = domingo), começando pela segunda
const DIAS_DA_SEMANA = [
  { numero: 1, curto: 'Seg' },
  { numero: 2, curto: 'Ter' },
  { numero: 3, curto: 'Qua' },
  { numero: 4, curto: 'Qui' },
  { numero: 5, curto: 'Sex' },
  { numero: 6, curto: 'Sáb' },
  { numero: 0, curto: 'Dom' },
];

// rotina sem "dias" vale para todos os dias da semana
function rotinaNoDia(tarefa, dataIso) {
  if (!tarefa.dias) return true;
  return tarefa.dias.includes(new Date(dataIso + 'T00:00:00').getDay());
}

// "Rotina diária" ou, por exemplo, "Seg, Qua e Sex"
function descricaoDosDias(tarefa) {
  if (!tarefa.dias) return 'Rotina diária';
  const nomes = DIAS_DA_SEMANA.filter((d) => tarefa.dias.includes(d.numero)).map((d) => d.curto);
  return nomes.length > 1 ? `${nomes.slice(0, -1).join(', ')} e ${nomes[nomes.length - 1]}` : nomes[0];
}

function tarefaFeitaHoje(tarefa) {
  if (tarefa.tipo === 'rotina') return tarefa.feitas.includes(dataISO());
  return Boolean(tarefa.concluidaEm);
}

function tarefasDeHoje(colaborador) {
  const hoje = dataISO();
  return colaborador.tarefas.filter((t) => (t.tipo === 'rotina' ? rotinaNoDia(t, hoje) : !t.concluidaEm || t.concluidaEm === hoje));
}

function marcarTarefa(tarefa, feita) {
  const hoje = dataISO();
  if (tarefa.tipo === 'rotina') {
    tarefa.feitas = tarefa.feitas.filter((d) => d !== hoje);
    if (feita) tarefa.feitas.push(hoje);
  } else {
    tarefa.concluidaEm = feita ? hoje : null;
  }
}

// percentual de dias em que a rotina foi feita nos últimos 7 dias (sem contar hoje e os dias fora da programação)
function assiduidadeDaRotina(colaborador) {
  const rotinas = colaborador.tarefas.filter((t) => t.tipo === 'rotina');
  if (!rotinas.length) return null;
  let possiveis = 0;
  let feitas = 0;
  for (let d = 1; d <= 7; d++) {
    const dia = diasAPartirDeHoje(-d);
    rotinas.forEach((t) => {
      if (dia < t.criadaEm || !rotinaNoDia(t, dia)) return;
      possiveis += 1;
      if (t.feitas.includes(dia)) feitas += 1;
    });
  }
  return possiveis ? porcentagem(feitas, possiveis) : null;
}

// check-in

const DIAS_ENTRE_CHECKINS = 7;

function proximoCheckin(colaborador) {
  const ultimo = colaborador.checkins[colaborador.checkins.length - 1];
  if (!ultimo) return { pendente: true, ultimo: null, emDias: 0 };
  const passados = diferencaEmDias(ultimo.data, dataISO());
  return { pendente: passados >= DIAS_ENTRE_CHECKINS, ultimo, emDias: DIAS_ENTRE_CHECKINS - passados };
}

// análise pro gestor

function resumoParaGestor(dados, colaborador) {
  const situacao = situacaoNaJornada(dados, colaborador);
  const treinamentos = treinamentosDaPessoa(dados, colaborador);
  const obrigatorios = treinamentos.filter((t) => t.obrigatorio && t.liberado);
  const hoje = tarefasDeHoje(colaborador);
  const pontuaisAtrasadas = colaborador.tarefas.filter((t) => t.tipo === 'pontual' && !t.concluidaEm && t.prazo < dataISO());
  const duvidasAguardando = colaborador.registros.filter((r) => r.destino === 'gestor' && !r.resposta);
  const assiduidade = assiduidadeDaRotina(colaborador);
  const ultimoCheckin = colaborador.checkins[colaborador.checkins.length - 1];

  const motivos = [];
  if (!situacao.concluido) {
    const atrasados = treinamentos.filter((t) => t.atrasado).length;
    if (atrasados) motivos.push(`${atrasados} ${atrasados === 1 ? 'treinamento atrasado' : 'treinamentos atrasados'}`);
    if (pontuaisAtrasadas.length) motivos.push(`${pontuaisAtrasadas.length} ${pontuaisAtrasadas.length === 1 ? 'tarefa atrasada' : 'tarefas atrasadas'}`);
    if (duvidasAguardando.length) motivos.push(`${duvidasAguardando.length} ${duvidasAguardando.length === 1 ? 'dúvida aguardando você' : 'dúvidas aguardando você'}`);
    if (assiduidade !== null && assiduidade < 50) motivos.push(`rotina feita em ${assiduidade}% dos dias`);
    if (ultimoCheckin && ultimoCheckin.nota <= 2 && diferencaEmDias(ultimoCheckin.data, dataISO()) <= 14) motivos.push(`check-in com nota ${ultimoCheckin.nota}`);
    if (colaborador.funcoes.length === 0) motivos.push('funções ainda não definidas');
  }

  return {
    situacao,
    hojeFeitas: hoje.filter(tarefaFeitaHoje).length,
    hojeTotal: hoje.length,
    obrigatoriosFeitos: obrigatorios.filter((t) => t.concluidoEm).length,
    obrigatoriosTotal: obrigatorios.length,
    duvidasAguardando,
    assiduidade,
    motivos,
  };
}

// notificações

function notificar(dados, destinatarioId, texto, link) {
  if (!dados.notificacoes[destinatarioId]) dados.notificacoes[destinatarioId] = [];
  dados.notificacoes[destinatarioId].unshift({ texto, data: new Date().toISOString(), lida: false, link });
}

// utilidades

function porcentagem(parte, total) {
  return total === 0 ? 0 : Math.round((parte / total) * 100);
}

function buscarColaborador(dados, id) {
  return dados.colaboradores.find((c) => c.id === id);
}

function novoId(prefixo) {
  return `${prefixo}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
}
