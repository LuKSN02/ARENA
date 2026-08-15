/* ===================================================================
   ARENA — DADOS DOS STREAMERS/CRIADORES PARCEIROS
   Cada entrada:
     name        — nome de exibição
     handle      — @ do canal
     avatarSeed  — texto usado pra gerar o placeholder de avatar
     game        — slug do jogo (bate com as var CSS --<slug> do site)
     gameLabel   — nome do jogo pra exibir
     platform    — "twitch" | "youtube"
     isLive      — true se estiver ao vivo agora
     viewers     — nº de espectadores (só relevante se isLive)
     followers   — nº de seguidores (exibido formatado)
     bio         — descrição curta
     url         — link do canal
   =================================================================== */
const STREAMERS = [
  {
    name: "Kira Voidwalker", handle: "@kiravoid", avatarSeed: "KV",
    game: "valorant", gameLabel: "Valorant", platform: "twitch",
    isLive: true, viewers: 4200, followers: 187000,
    bio: "Ex-jogadora de campeonato, hoje foca em análise de replay e ranked de alto nível.",
    url: "#",
  },
  {
    name: "Ryzen Play", handle: "@ryzenplay", avatarSeed: "RP",
    game: "lol", gameLabel: "League of Legends", platform: "youtube",
    isLive: false, viewers: 0, followers: 342000,
    bio: "Guias de rota e análise tática pra quem quer subir de elo rápido.",
    url: "#",
  },
  {
    name: "Nina Frag", handle: "@ninafrag", avatarSeed: "NF",
    game: "cs2", gameLabel: "CS2", platform: "twitch",
    isLive: true, viewers: 9800, followers: 512000,
    bio: "Aim training ao vivo todo dia e reação aos grandes campeonatos de CS.",
    url: "#",
  },
  {
    name: "Doom Bringer", handle: "@doombringer", avatarSeed: "DB",
    game: "dota2", gameLabel: "Dota 2", platform: "youtube",
    isLive: false, viewers: 0, followers: 98000,
    bio: "Cover completo de patches novos e builds de item pouco convencionais.",
    url: "#",
  },
  {
    name: "Vic Solo", handle: "@vicsolo", avatarSeed: "VS",
    game: "fortnite", gameLabel: "Fortnite", platform: "twitch",
    isLive: true, viewers: 2600, followers: 154000,
    bio: "Build fights insanas e participação ativa em torneios de Arena.",
    url: "#",
  },
  {
    name: "Comandante Rex", handle: "@comandanterex", avatarSeed: "CR",
    game: "cod", gameLabel: "Call of Duty", platform: "youtube",
    isLive: false, viewers: 0, followers: 221000,
    bio: "Loadouts atualizados a cada temporada e gameplay de Ranked Play.",
    url: "#",
  },
  {
    name: "Ale Fênix", handle: "@alefenix", avatarSeed: "AF",
    game: "freefire", gameLabel: "Free Fire", platform: "twitch",
    isLive: true, viewers: 6100, followers: 430000,
    bio: "Uma das maiores criadoras de conteúdo de Free Fire do Brasil.",
    url: "#",
  },
  {
    name: "Zed Cypher", handle: "@zedcypher", avatarSeed: "ZC",
    game: "apex", gameLabel: "Apex Legends", platform: "youtube",
    isLive: false, viewers: 0, followers: 76000,
    bio: "Highlights semanais e análise de meta de personagens.",
    url: "#",
  },
];

/* ===================================================================
   CAMADA ASSÍNCRONA — mesmo padrão de data/campeonatos.js. STREAMERS
   continua existindo como array, mas getStreamers() é o jeito
   preferido de ler a partir de agora: devolve uma Promise, hoje só
   resolvendo o array estático depois de um atraso simulado. No dia
   de trocar por uma API de verdade, só o corpo da função muda.
   =================================================================== */
const SIMULATED_LATENCY_MS = 450;
function getStreamers() {
  return new Promise((resolve) => {
    setTimeout(() => resolve(STREAMERS), SIMULATED_LATENCY_MS);
  });
}

window.ArenaData = Object.assign(window.ArenaData || {}, { getStreamers });
