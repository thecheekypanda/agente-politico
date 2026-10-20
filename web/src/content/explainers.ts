export interface Explainer {
  slug: string;
  title: string;
  summary: string;
  body: string[];
}

// Launch set of ~15 explainers, docs/o-que-fizeram-strategy.md §6.
export const EXPLAINERS: Explainer[] = [
  {
    slug: 'estado-portugues-como-esta-organizado',
    title: 'Como o Estado português está organizado',
    summary: 'Os três poderes — legislativo, executivo e judicial — e como se relacionam.',
    body: [
      'O Estado português organiza-se em três poderes distintos, cada um com funções próprias e mecanismos de controlo sobre os outros dois — o chamado sistema de separação e interdependência de poderes.',
      'O poder legislativo é exercido pela Assembleia da República, que aprova leis, fiscaliza o Governo e aprova o Orçamento do Estado. O poder executivo é exercido pelo Governo, liderado pelo Primeiro-Ministro, que administra o país e pode também legislar em certas matérias através de decretos-lei. O poder judicial é exercido pelos tribunais, que aplicam a lei de forma independente aos casos concretos.',
      'A estes três poderes soma-se o Presidente da República, eleito diretamente pelos cidadãos, com um papel de moderação institucional — nomeia o Primeiro-Ministro, pode dissolver a Assembleia da República, e promulga (ou veta) leis e decretos-lei.',
    ],
  },
  {
    slug: 'assembleia-da-republica',
    title: 'O que é a Assembleia da República e como se elege',
    summary: 'O parlamento português: 230 deputados eleitos por sufrágio direto e universal.',
    body: [
      'A Assembleia da República é o parlamento português, composto por 230 deputados eleitos por sufrágio direto e universal, normalmente por um período de quatro anos (uma legislatura).',
      'Os deputados são eleitos por círculos eleitorais, que correspondem sobretudo aos distritos do país, mais dois círculos para os portugueses residentes no estrangeiro (Europa e fora da Europa). Cada círculo elege um número de deputados proporcional à sua população, através de listas partidárias.',
      'Entre as suas competências estão aprovar leis, aprovar o Orçamento do Estado, fiscalizar a atividade do Governo (incluindo através de perguntas, audições e inquéritos parlamentares), e eleger ou destituir o Governo através de moções de confiança ou de censura.',
    ],
  },
  {
    slug: 'governo-e-conselho-de-ministros',
    title: 'O que é o Governo e o Conselho de Ministros',
    summary: 'O poder executivo: quem o compõe e o que faz.',
    body: [
      'O Governo é o órgão que conduz a política geral do país e é o principal responsável pelo poder executivo. É composto pelo Primeiro-Ministro, pelos Ministros e, em muitos casos, por Secretários e Subsecretários de Estado.',
      'O Conselho de Ministros reúne o Primeiro-Ministro e os Ministros para decidir sobre as matérias mais importantes da ação governativa, incluindo a aprovação de propostas de lei a enviar à Assembleia da República e de decretos-lei.',
      'O Governo depende da confiança política da Assembleia da República — pode ser demitido através de uma moção de censura aprovada, ou se uma moção de confiança que ele próprio apresente for rejeitada.',
    ],
  },
  {
    slug: 'o-papel-do-presidente-da-republica',
    title: 'O papel do Presidente da República',
    summary: 'Um poder moderador: nomeações, promulgação, veto e dissolução.',
    body: [
      'O Presidente da República é eleito diretamente pelos cidadãos, por um mandato de cinco anos, e desempenha um papel de moderação institucional entre os restantes órgãos de soberania — não governa diretamente o país no dia a dia.',
      'Entre os seus poderes estão nomear o Primeiro-Ministro (tendo em conta os resultados eleitorais), promulgar leis e decretos-lei para que possam entrar em vigor, e vetar diplomas devolvendo-os para nova apreciação em vez de os promulgar de imediato.',
      'Em situações excecionais, o Presidente da República pode também dissolver a Assembleia da República, o que obriga à realização de novas eleições legislativas.',
    ],
  },
  {
    slug: 'tribunal-constitucional',
    title: 'O que faz o Tribunal Constitucional',
    summary: 'O guardião da Constituição: verifica se leis e decretos-lei são constitucionais.',
    body: [
      'O Tribunal Constitucional é o órgão responsável por administrar a justiça em matérias de natureza jurídico-constitucional, ou seja, por verificar se as leis, decretos-lei e outros atos normativos respeitam a Constituição.',
      'Pode ser chamado a pronunciar-se antes de um diploma entrar em vigor (fiscalização preventiva, normalmente a pedido do Presidente da República) ou depois, já em vigor (fiscalização sucessiva, a pedido de diversas entidades, incluindo um número mínimo de deputados).',
      'Se declarar uma norma inconstitucional com força obrigatória geral, essa norma deixa de poder ser aplicada, o que pode obrigar a Assembleia da República ou o Governo a legislar de novo sobre a matéria.',
    ],
  },
  {
    slug: 'comissao-nacional-de-eleicoes',
    title: 'O que faz a Comissão Nacional de Eleições',
    summary: 'O organismo que fiscaliza a legalidade e a igualdade de tratamento nos atos eleitorais.',
    body: [
      'A Comissão Nacional de Eleições (CNE) é o organismo independente responsável por garantir a legalidade e a igualdade de oportunidades entre candidaturas em todos os atos eleitorais e referendos em Portugal.',
      'Entre as suas funções estão fiscalizar a propaganda eleitoral, os tempos de antena, o financiamento das campanhas, e a organização material das eleições, bem como registar as candidaturas apresentadas pelos partidos e coligações.',
      'A CNE não publica os programas eleitorais completos dos partidos — esses são publicados por cada partido no seu próprio site oficial, sendo essa a fonte usada por este projeto para o motor de alinhamento (ver a página de metodologia).',
    ],
  },
  {
    slug: 'como-nasce-uma-lei',
    title: 'Como nasce uma lei — da iniciativa à publicação no Diário da República',
    summary: 'O percurso completo de um Projeto ou Proposta de Lei até se tornar lei em vigor.',
    body: [
      'Uma lei começa como uma iniciativa legislativa — um Projeto de Lei (apresentado por deputados) ou uma Proposta de Lei (apresentada pelo Governo) — que dá entrada na Assembleia da República.',
      'Segue-se a discussão na generalidade em plenário, onde se debatem os princípios gerais da iniciativa. Se for aprovada nesta fase, baixa à comissão parlamentar competente para a discussão e votação na especialidade, artigo a artigo, incluindo eventuais propostas de alteração.',
      'O texto final resultante desse trabalho volta ao plenário para a votação final global. Se aprovado, torna-se um Decreto da Assembleia da República, que é enviado ao Presidente da República para promulgação.',
      'Só depois de promulgado e publicado no Diário da República é que o diploma entra formalmente em vigor e passa a ser lei aplicável a todos.',
    ],
  },
  {
    slug: 'projeto-vs-proposta-de-lei',
    title: 'Projeto de Lei vs. Proposta de Lei — qual a diferença',
    summary: 'A mesma tramitação, origens diferentes: deputados ou Governo.',
    body: [
      'Um Projeto de Lei e uma Proposta de Lei são ambos textos legislativos com o objetivo de criar ou alterar uma lei, e seguem exatamente o mesmo processo de tramitação na Assembleia da República — a única diferença é quem os apresenta.',
      'Um Projeto de Lei é apresentado por deputados ou por um grupo parlamentar. Uma Proposta de Lei é apresentada pelo Governo, através do Conselho de Ministros, e chega à Assembleia já com a aprovação prévia do executivo.',
      'Esta distinção é relevante para entender quem está a propor uma determinada medida — se resulta da iniciativa direta de um partido na Assembleia, ou se reflete uma decisão já tomada pelo Governo.',
    ],
  },
  {
    slug: 'baixa-a-comissao',
    title: 'O que significa "baixa à comissão"',
    summary: 'A fase de trabalho mais detalhado, longe do plenário, antes da votação final.',
    body: [
      '"Baixa à comissão" descreve o momento em que uma iniciativa legislativa, depois de aprovada na generalidade em plenário, passa para uma comissão parlamentar especializada — por exemplo, a Comissão de Saúde, se a iniciativa for sobre esse tema.',
      'É nesta fase que o texto é analisado com mais detalhe, artigo a artigo, e onde os diferentes grupos parlamentares podem apresentar propostas de alteração concretas. Um relator é normalmente designado para acompanhar o processo e preparar um relatório final.',
      'Só depois deste trabalho em comissão é que o texto (já eventualmente alterado) volta ao plenário para a votação final global.',
    ],
  },
  {
    slug: 'votacoes-em-plenario',
    title: 'Como funcionam as votações em plenário',
    summary: 'Quem vota, como se conta, e o que significam os diferentes resultados.',
    body: [
      'As votações em plenário da Assembleia da República decidem se uma iniciativa legislativa avança, é alterada, ou é rejeitada. Cada deputado presente vota a favor, contra, ou abstém-se — sendo também registadas as ausências.',
      'Uma votação pode ser unânime (quando todos os presentes votam da mesma forma) ou ter posições diferentes entre grupos parlamentares — e, no caso de coligações como a AD, é possível que os partidos que a compõem votem de forma diferente entre si numa mesma votação.',
      'O resultado de uma votação (aprovado, rejeitado, ou outro) é um facto direto e verificável, retirado diretamente dos registos oficiais — nunca inferido ou interpretado.',
    ],
  },
  {
    slug: 'decreto-lei-e-autorizacoes-legislativas',
    title: 'O que é um Decreto-Lei e quando o Governo pode legislar sem a Assembleia',
    summary: 'Legislar sem passar pelo parlamento — dentro de limites definidos pela Constituição.',
    body: [
      'Um Decreto-Lei é um ato legislativo aprovado diretamente pelo Governo, sem necessidade de aprovação prévia pela Assembleia da República — mas apenas em matérias em que a Constituição o permite, ou quando a Assembleia tenha concedido uma autorização legislativa específica para esse efeito.',
      'Há matérias reservadas exclusivamente à Assembleia da República (por exemplo, direitos fundamentais dos cidadãos), onde o Governo não pode legislar por decreto-lei sem essa autorização prévia.',
      'Depois de publicado, um Decreto-Lei pode ainda ser sujeito a apreciação parlamentar — um mecanismo que permite à Assembleia da República analisá-lo posteriormente e, se entender, alterá-lo ou revogá-lo.',
    ],
  },
  {
    slug: 'orcamento-do-estado',
    title: 'O Orçamento do Estado — como é discutido e aprovado',
    summary: 'A lei mais importante do ano: receitas, despesas, e um processo próprio.',
    body: [
      'O Orçamento do Estado é a lei que define as receitas e despesas previstas do Estado português para o ano seguinte, e é uma das iniciativas legislativas mais importantes de cada ano parlamentar.',
      'É sempre apresentado pelo Governo, sob a forma de Proposta de Lei, e segue uma tramitação com prazos e regras próprias — incluindo uma votação inicial na generalidade e uma votação final global, com discussão na especialidade em comissão entre as duas.',
      'A rejeição do Orçamento do Estado é politicamente muito significativa e pode, dependendo das circunstâncias, colocar em causa a continuidade do Governo.',
    ],
  },
  {
    slug: 'peticoes',
    title: 'O que são petições e como os cidadãos as podem usar',
    summary: 'Uma forma direta de qualquer cidadão levar um assunto à Assembleia da República.',
    body: [
      'Uma petição é um pedido, queixa ou sugestão que qualquer cidadão (ou grupo de cidadãos) pode apresentar diretamente à Assembleia da República sobre um assunto de interesse público, sem necessidade de ser deputado ou de pertencer a um partido.',
      'Petições com um número mínimo de assinaturas podem obrigar a uma discussão em plenário, dando aos cidadãos um mecanismo direto de participação política, independente dos partidos.',
      'Este mecanismo é distinto do direito de apresentar iniciativas legislativas (Projetos de Lei), que continua reservado a deputados e ao Governo — uma petição pode, no entanto, inspirar ou pressionar por uma iniciativa legislativa desse tipo.',
    ],
  },
  {
    slug: 'mocoes-de-censura-e-de-confianca',
    title: 'Moções de censura e de confiança — o que significam',
    summary: 'Dois mecanismos, direções opostas, para testar o apoio parlamentar ao Governo.',
    body: [
      'Uma moção de censura é apresentada por deputados que pretendem forçar a demissão do Governo — se for aprovada em votação por maioria absoluta dos deputados em efetividade de funções, o Governo cai.',
      'Uma moção de confiança tem a direção contrária: é apresentada pelo próprio Governo, a pedir à Assembleia da República que confirme o seu apoio político. Se for rejeitada, o Governo também cai.',
      'Ambos os mecanismos são formas de testar, em qualquer momento da legislatura, se o Governo mantém o apoio da maioria parlamentar necessário para continuar a governar.',
    ],
  },
  {
    slug: 'coligacoes-de-governo',
    title: 'Como funciona uma coligação de governo (ex.: AD)',
    summary: 'Quando dois ou mais partidos concorrem e governam juntos, mas continuam a existir separadamente.',
    body: [
      'Uma coligação é um acordo entre dois ou mais partidos para concorrerem juntos a eleições (e, se vencerem, governarem juntos), normalmente sob uma marca e um programa eleitoral comuns.',
      'A AD (Aliança Democrática) é o exemplo mais relevante para este projeto: uma coligação entre o PSD e o CDS-PP que concorreu com um programa eleitoral único em 2025. Ainda assim, os registos oficiais de votação na Assembleia da República continuam a identificar o PSD e o CDS-PP como grupos parlamentares distintos.',
      'É por isso que este projeto mapeia o mesmo programa eleitoral da AD a ambas as siglas (PSD e CDS-PP) para efeitos de alinhamento, mas mostra sempre a posição de voto de cada uma separadamente — se um dia votarem de forma diferente sobre a mesma iniciativa, essa diferença é mostrada, nunca escondida ou fundida numa única posição.',
    ],
  },
];

export function findExplainer(slug: string): Explainer | undefined {
  return EXPLAINERS.find((entry) => entry.slug === slug);
}
