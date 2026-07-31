export interface GlossaryEntry {
  slug: string;
  term: string;
  definition: string;
  // Set only for terms with a directly related explainer — journey 3 in
  // docs/o-que-fizeram-strategy.md: "a link to the full explainer if they
  // want more."
  explainerSlug?: string;
}

// Launch set of ~25 terms, docs/o-que-fizeram-strategy.md §6.
export const GLOSSARY: GlossaryEntry[] = [
  {
    slug: 'projeto-de-lei',
    term: 'Projeto de Lei',
    definition:
      'Uma proposta de lei apresentada por deputados ou grupos parlamentares (não pelo Governo). É uma das formas mais comuns de iniciativa legislativa na Assembleia da República.',
    explainerSlug: 'projeto-vs-proposta-de-lei',
  },
  {
    slug: 'proposta-de-lei',
    term: 'Proposta de Lei',
    definition:
      'Uma proposta de lei apresentada pelo Governo (em vez de por deputados). Segue depois o mesmo processo parlamentar que um Projeto de Lei.',
    explainerSlug: 'projeto-vs-proposta-de-lei',
  },
  {
    slug: 'projeto-de-resolucao',
    term: 'Projeto de Resolução',
    definition:
      'Um texto em que a Assembleia da República recomenda algo ao Governo ou toma posição sobre um assunto — não cria lei, é uma tomada de posição ou recomendação política.',
  },
  {
    slug: 'decreto-lei',
    term: 'Decreto-Lei',
    definition:
      'Um ato legislativo aprovado diretamente pelo Governo, sem passar pela Assembleia da República, em matérias em que a Constituição o permite. Publica-se no Diário da República tal como uma lei.',
    explainerSlug: 'decreto-lei-e-autorizacoes-legislativas',
  },
  {
    slug: 'decreto-da-assembleia-da-republica',
    term: 'Decreto da Assembleia da República',
    definition:
      'O texto final aprovado pela Assembleia da República depois de uma votação final global, ainda antes de ser promulgado pelo Presidente da República e publicado como lei.',
  },
  {
    slug: 'baixa-a-comissao',
    term: 'Baixa à comissão',
    definition:
      'A fase em que um projeto ou proposta de lei passa da discussão em plenário para uma comissão parlamentar especializada, para ser analisado e eventualmente alterado antes da votação final.',
    explainerSlug: 'baixa-a-comissao',
  },
  {
    slug: 'discussao-na-generalidade',
    term: 'Discussão na generalidade',
    definition:
      'O primeiro debate em plenário sobre uma iniciativa legislativa, focado nos seus princípios e objetivos gerais, antes de qualquer discussão sobre os artigos concretos do texto.',
    explainerSlug: 'como-nasce-uma-lei',
  },
  {
    slug: 'discussao-e-votacao-na-especialidade',
    term: 'Discussão e votação na especialidade',
    definition:
      'A fase, normalmente em comissão, em que se discute e vota artigo a artigo o texto de uma iniciativa legislativa, incluindo propostas de alteração apresentadas pelos grupos parlamentares.',
    explainerSlug: 'como-nasce-uma-lei',
  },
  {
    slug: 'votacao-final-global',
    term: 'Votação final global',
    definition:
      'A votação em plenário do texto completo de uma iniciativa legislativa, já depois da discussão e votação na especialidade — o último passo antes de o texto seguir para promulgação.',
    explainerSlug: 'votacoes-em-plenario',
  },
  {
    slug: 'grupo-parlamentar',
    term: 'Grupo parlamentar',
    definition:
      'O conjunto de deputados eleitos por um mesmo partido (ou coligação) na Assembleia da República, organizados para atuar de forma coordenada nos trabalhos parlamentares.',
    explainerSlug: 'assembleia-da-republica',
  },
  {
    slug: 'bancada',
    term: 'Bancada',
    definition:
      'Termo usado, muitas vezes como sinónimo de grupo parlamentar, para designar o conjunto de deputados de um partido sentados juntos no plenário da Assembleia da República.',
  },
  {
    slug: 'deputado',
    term: 'Deputado',
    definition:
      'Um membro eleito da Assembleia da República, representando um círculo eleitoral, com o poder de apresentar, discutir e votar iniciativas legislativas.',
    explainerSlug: 'assembleia-da-republica',
  },
  {
    slug: 'circulo-eleitoral',
    term: 'Círculo eleitoral',
    definition:
      'Uma divisão territorial (normalmente correspondendo a um distrito, mais os círculos da emigração) usada para eleger deputados à Assembleia da República.',
    explainerSlug: 'assembleia-da-republica',
  },
  {
    slug: 'legislatura',
    term: 'Legislatura',
    definition:
      'O período de funcionamento da Assembleia da República entre duas eleições legislativas, composto normalmente por quatro sessões legislativas anuais.',
  },
  {
    slug: 'sessao-legislativa',
    term: 'Sessão legislativa',
    definition:
      'Cada um dos períodos anuais de funcionamento da Assembleia da República dentro de uma legislatura, geralmente com início em setembro.',
  },
  {
    slug: 'mocao-de-censura',
    term: 'Moção de censura',
    definition:
      'Uma iniciativa apresentada por deputados para forçar a demissão do Governo, através de uma votação em plenário. Se aprovada, o Governo cai.',
    explainerSlug: 'mocoes-de-censura-e-de-confianca',
  },
  {
    slug: 'mocao-de-confianca',
    term: 'Moção de confiança',
    definition:
      'Uma iniciativa apresentada pelo próprio Governo, pedindo à Assembleia da República que confirme o seu apoio político. Se for rejeitada, o Governo cai.',
    explainerSlug: 'mocoes-de-censura-e-de-confianca',
  },
  {
    slug: 'comissao-parlamentar',
    term: 'Comissão parlamentar',
    definition:
      'Um grupo mais pequeno de deputados, organizado por área temática (ex.: Saúde, Orçamento, Justiça), que analisa em detalhe as iniciativas legislativas antes de irem a votação final em plenário.',
  },
  {
    slug: 'relator',
    term: 'Relator',
    definition:
      'O deputado designado numa comissão parlamentar para estudar uma iniciativa em detalhe e elaborar um parecer ou relatório que orienta a discussão dos restantes deputados.',
  },
  {
    slug: 'audicao-parlamentar',
    term: 'Audição parlamentar',
    definition:
      'Uma sessão em que uma comissão parlamentar ouve um membro do Governo, um especialista, ou outra entidade, para recolher informação relevante para um assunto em discussão.',
  },
  {
    slug: 'peticao',
    term: 'Petição',
    definition:
      'Um pedido, queixa ou sugestão que qualquer cidadão pode apresentar à Assembleia da República sobre um assunto de interesse público, podendo ser subscrito por mais pessoas para ganhar peso político.',
    explainerSlug: 'peticoes',
  },
  {
    slug: 'apreciacao-parlamentar',
    term: 'Apreciação parlamentar',
    definition:
      'O mecanismo através do qual a Assembleia da República pode analisar e eventualmente alterar ou revogar um Decreto-Lei já aprovado pelo Governo.',
    explainerSlug: 'decreto-lei-e-autorizacoes-legislativas',
  },
  {
    slug: 'lei-de-bases',
    term: 'Lei de Bases',
    definition:
      'Uma lei que estabelece os princípios gerais de uma determinada área (ex.: saúde, educação), deixando os detalhes de aplicação para legislação complementar, muitas vezes por Decreto-Lei do Governo.',
  },
  {
    slug: 'veto-presidencial',
    term: 'Veto presidencial',
    definition:
      'O poder do Presidente da República de devolver à Assembleia da República (ou ao Governo, no caso de um Decreto-Lei) um diploma para nova apreciação, em vez de o promulgar de imediato.',
    explainerSlug: 'o-papel-do-presidente-da-republica',
  },
  {
    slug: 'promulgacao',
    term: 'Promulgação',
    definition:
      'O ato pelo qual o Presidente da República assina um diploma já aprovado (lei, decreto-lei, etc.), permitindo que seja publicado em Diário da República e entre em vigor.',
    explainerSlug: 'como-nasce-uma-lei',
  },
  {
    slug: 'referendo',
    term: 'Referendo',
    definition:
      'Uma consulta direta aos cidadãos eleitores sobre uma questão concreta de relevante interesse nacional, cujo resultado pode ter efeito vinculativo dependendo da participação.',
  },
];

export function findGlossaryEntry(slug: string): GlossaryEntry | undefined {
  return GLOSSARY.find((entry) => entry.slug === slug);
}
