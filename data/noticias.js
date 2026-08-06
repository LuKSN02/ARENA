// ===============================================================
// FONTE ÚNICA DE DADOS — jogos, notícias e próximas partidas.
//
// Carregado via <script src="data/noticias.js"></script> em
// home.html, jogo.html e noticia.html. Editar as notícias aqui
// faz elas aparecerem automaticamente nas três páginas.
//
// Em produção isso seria substituído por uma chamada ao
// CMS/Firebase em vez de um objeto estático — a estrutura (chaves
// e formato de cada notícia) seria a mesma.
// ===============================================================
const GAMES = {
  valorant: {
    label: "Valorant", accent: "#FF4655", glow: "#241016",
    desc: "Tiro tático 5x5 da Riot Games, com agentes e habilidades únicas.",
    news: [
      { title: "LOUD vira sobre Sentinels e avança às finais do VCT Americas", excerpt: "Equipe brasileira domina o mapa decisivo e garante vaga na grande final.", author: "Rafael Souza", date: "05/08/2026", readTimeMin: 4, isLive: true, category: "campeonatos" },
      { title: "Riot anuncia novo agente para o próximo ato", excerpt: "Personagem traz habilidade de controle de área inédita no jogo.", author: "Camila Reis", date: "03/08/2026", readTimeMin: 3, category: "lancamentos" },
      { title: "MIBR reformula elenco visando o próximo circuito", excerpt: "Organização anuncia duas contratações e a saída do IGL histórico.", author: "Felipe Andrade", date: "01/08/2026", readTimeMin: 3, category: "campeonatos" },
      { title: "Novo mapa entra em rotação competitiva nesta semana", excerpt: "Riot confirma mudanças no pool de mapas do circuito internacional.", author: "Camila Reis", date: "29/07/2026", readTimeMin: 2, category: "lancamentos" },
    ],
    matches: [
      { day: "QUI", date: "07/08", match: "LOUD x Sentinels", time: "20h00" },
      { day: "SÁB", date: "09/08", match: "MIBR x KRÜ", time: "18h00" },
    ],
  },
  lol: {
    label: "League of Legends", accent: "#C89B3C", glow: "#221d10",
    desc: "MOBA 5x5 da Riot Games, um dos maiores cenários competitivos do mundo.",
    news: [
      { title: "Patch 14.3 reformula a rota de suporte", excerpt: "Riot ajusta itens de visão e reduz poder de campeões de engajamento.", author: "Marina Alves", date: "04/08/2026", readTimeMin: 6, category: "lancamentos" },
      { title: "CBLOL define chaveamento do playoffs", excerpt: "paiN Gaming garante vantagem de mando de campo na semifinal.", author: "Bruno Tavares", date: "02/08/2026", readTimeMin: 3, category: "campeonatos" },
      { title: "Worlds 2026 terá fase de grupos em novo formato", excerpt: "Riot anuncia mudança para aumentar o número de jogos internacionais.", author: "Marina Alves", date: "30/07/2026", readTimeMin: 4, isLive: true, category: "campeonatos" },
      { title: "Jogador brasileiro é anunciado em time europeu", excerpt: "Transferência movimenta o mercado de contratações da offseason.", author: "Igor Nascimento", date: "27/07/2026", readTimeMin: 3, category: "campeonatos" },
    ],
    matches: [
      { day: "SÁB", date: "09/08", match: "paiN x RED", time: "17h30" },
      { day: "DOM", date: "10/08", match: "LOUD x Flamengo", time: "20h00" },
    ],
  },
  cs2: {
    label: "CS2", accent: "#E8A03D", glow: "#241c10",
    desc: "A nova geração do Counter-Strike, tiro tático 5x5 da Valve.",
    news: [
      { title: "FURIA bate NAVI de virada e assume liderança em Cologne", excerpt: "Time brasileiro vira desvantagem de 4 rounds no mapa decisivo.", author: "Bruno Tavares", date: "05/08/2026", readTimeMin: 3, isLive: true, category: "campeonatos" },
      { title: "Valve libera atualização de balanceamento de armas", excerpt: "Ajustes miram reduzir domínio de rifles em mapas específicos.", author: "Diego Martins", date: "01/08/2026", readTimeMin: 4, category: "lancamentos" },
      { title: "Imperial anuncia novo treinador para o segundo semestre", excerpt: "Organização aposta em nome experiente para reforçar preparação tática.", author: "Diego Martins", date: "28/07/2026", readTimeMin: 3, category: "campeonatos" },
      { title: "Major de 2026 terá etapa sul-americana pela primeira vez", excerpt: "Valve confirma sede no Brasil para uma das fases classificatórias.", author: "Bruno Tavares", date: "25/07/2026", readTimeMin: 5, category: "campeonatos" },
    ],
    matches: [
      { day: "SEX", date: "08/08", match: "FURIA x G2", time: "13h00" },
      { day: "DOM", date: "10/08", match: "MIBR x Imperial", time: "14h00" },
    ],
  },
  dota2: {
    label: "Dota 2", accent: "#C23C2A", glow: "#241412",
    desc: "MOBA 5x5 da Valve, conhecido pela profundidade tática e pelo The International.",
    news: [
      { title: "Abertas as classificatórias sul-americanas para o TI", excerpt: "Oito equipes disputam duas vagas para o torneio internacional em setembro.", author: "Camila Reis", date: "30/07/2026", readTimeMin: 5, category: "campeonatos" },
      { title: "Patch 7.42 traz reformulação completa da selva", excerpt: "Valve altera spawns de criatura e recompensas de itens neutros.", author: "Rodrigo Faria", date: "26/07/2026", readTimeMin: 4, category: "lancamentos" },
      { title: "Equipe brasileira confirma escalação para a nova temporada", excerpt: "Organização mantém núcleo e anuncia apenas uma contratação pontual.", author: "Rodrigo Faria", date: "22/07/2026", readTimeMin: 3, category: "campeonatos" },
    ],
    matches: [
      { day: "DOM", date: "10/08", match: "Team Liquid x OG", time: "15h00" },
    ],
  },
  fortnite: {
    label: "Fortnite", accent: "#8B5CF6", glow: "#1c1428",
    desc: "Battle royale da Epic Games, com construção e eventos ao vivo dentro do jogo.",
    news: [
      { title: "Nova temporada traz mapa reformulado e colab surpresa", excerpt: "Epic Games confirma evento ao vivo no servidor para a virada de temporada.", author: "Diego Martins", date: "05/08/2026", readTimeMin: 3, isLive: true, category: "lancamentos" },
      { title: "FNCS anuncia premiação recorde para a grande final", excerpt: "Epic Games eleva o prize pool da etapa global deste ciclo competitivo.", author: "Ana Beatriz", date: "31/07/2026", readTimeMin: 3, category: "campeonatos" },
      { title: "Novo modo de jogo é liberado em caráter experimental", excerpt: "Atualização adiciona variação de battle royale com equipes reduzidas.", author: "Diego Martins", date: "28/07/2026", readTimeMin: 2, category: "lancamentos" },
    ],
    matches: [
      { day: "SEG", date: "11/08", match: "FNCS — Grande Final", time: "16h00" },
    ],
  },
  cod: {
    label: "Call of Duty", accent: "#5B90C9", glow: "#131c26",
    desc: "Franquia de FPS tático da Activision, com cenário competitivo na Call of Duty League.",
    news: [
      { title: "Call of Duty League anuncia formato para os playoffs", excerpt: "Fase final volta ao modelo presencial com oito equipes classificadas.", author: "Pedro Lima", date: "29/07/2026", readTimeMin: 4, category: "campeonatos" },
      { title: "Atualização de balanceamento mexe no meta competitivo", excerpt: "Desenvolvedora reduz dano de submetralhadoras nas modalidades ranqueadas.", author: "Pedro Lima", date: "24/07/2026", readTimeMin: 3, category: "lancamentos" },
      { title: "Time brasileiro é confirmado no próximo Major internacional", excerpt: "Organização garante vaga após campanha sólida nas eliminatórias.", author: "Renata Dias", date: "20/07/2026", readTimeMin: 3, category: "campeonatos" },
    ],
    matches: [
      { day: "QUI", date: "07/08", match: "OpTic x Atlanta FaZe", time: "21h00" },
    ],
  },
  freefire: {
    label: "Free Fire", accent: "#FF5722", glow: "#251510",
    desc: "Battle royale mobile da Garena, um dos jogos mais populares do Brasil.",
    news: [
      { title: "Free Fire World Series chega ao Brasil em outubro", excerpt: "Garena confirma São Paulo como sede da etapa e abre venda de ingressos.", author: "Ana Beatriz", date: "03/08/2026", readTimeMin: 3, isLive: true, category: "campeonatos" },
      { title: "Nova personagem é revelada com habilidade de suporte", excerpt: "Garena apresenta detalhes da personagem que chega na próxima atualização.", author: "Thiago Nunes", date: "29/07/2026", readTimeMin: 2, category: "lancamentos" },
      { title: "Liga brasileira anuncia expansão para 16 equipes", excerpt: "Formato do campeonato nacional cresce para a próxima temporada.", author: "Ana Beatriz", date: "24/07/2026", readTimeMin: 4, category: "campeonatos" },
    ],
    matches: [
      { day: "DOM", date: "10/08", match: "Final regional — Free Fire", time: "19h00" },
    ],
  },
  apex: {
    label: "Apex Legends", accent: "#DA3B46", glow: "#24141a",
    desc: "Battle royale de heróis da Respawn Entertainment, com cenário competitivo na ALGS.",
    news: [
      { title: "ALGS anuncia nova lenda jogável para o próximo split", excerpt: "Respawn revela mudanças no meta competitivo antes da temporada de ranked.", author: "Lucas Prado", date: "28/07/2026", readTimeMin: 4, category: "lancamentos" },
      { title: "Evento colaborativo traz skins temáticas por tempo limitado", excerpt: "Respawn confirma parceria inédita para a próxima season.", author: "Lucas Prado", date: "23/07/2026", readTimeMin: 2, category: "lancamentos" },
    ],
    matches: [],
  },
  mlbb: {
    label: "Mobile Legends", accent: "#17B8A6", glow: "#0f2422",
    desc: "MOBA mobile da Moonton, extremamente popular no Sudeste Asiático e em crescimento no Brasil.",
    news: [
      { title: "M-Series confirma fase de grupos com times brasileiros", excerpt: "Moonton libera calendário completo do maior torneio mundial de MLBB.", author: "Thiago Nunes", date: "27/07/2026", readTimeMin: 3, category: "campeonatos" },
      { title: "Novo herói é adicionado ao servidor global", excerpt: "Personagem chega com kit voltado para jogadas de emboscada.", author: "Thiago Nunes", date: "21/07/2026", readTimeMin: 2, category: "lancamentos" },
    ],
    matches: [],
  },
  rocketleague: {
    label: "Rocket League", accent: "#2F8EFF", glow: "#101c2c",
    desc: "Futebol com carros da Psyonix, com cenário competitivo na RLCS.",
    news: [
      { title: "RLCS: equipe brasileira vira 0x2 e vence de virada", excerpt: "Gols aéreos decidem confronto eletrizante na fase de grupos do Major.", author: "Gabriel Costa", date: "04/08/2026", readTimeMin: 3, isLive: true, category: "campeonatos" },
      { title: "Psyonix anuncia nova temporada com arena inédita", excerpt: "Mapa competitivo estreia oficialmente no próximo patch do jogo.", author: "Gabriel Costa", date: "26/07/2026", readTimeMin: 2, category: "lancamentos" },
    ],
    matches: [],
  },
  eafc: {
    label: "EA FC", accent: "#2ECC71", glow: "#10241a",
    desc: "Simulador de futebol da EA Sports, com cenário competitivo global de e-football.",
    news: [
      { title: "eChampions League define os classificados para as quartas", excerpt: "Jogador brasileiro avança com campanha invicta na fase de grupos.", author: "Renata Dias", date: "26/07/2026", readTimeMin: 3, category: "campeonatos" },
      { title: "Atualização de gameplay ajusta física de finalização", excerpt: "EA Sports promete maior realismo em chutes de fora da área.", author: "Renata Dias", date: "20/07/2026", readTimeMin: 2, category: "lancamentos" },
    ],
    matches: [],
  },
};
