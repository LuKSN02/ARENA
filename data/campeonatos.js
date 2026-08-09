/* ===================================================================
   ARENA — DADOS DOS CAMPEONATOS (CHAVEAMENTO)
   Cada campeonato:
     id, name, game (slug), gameLabel, status ("ao-vivo" | "em-breve" | "encerrado")
     prizePool — string de exibição
     rounds — array de rodadas, cada uma com:
       label — nome da rodada ("Quartas de Final", "Semifinal"...)
       matches — array de partidas:
         teamA, teamB — { name, seed, logoSeed }
         scoreA, scoreB — número (null se ainda não jogou)
         status — "ao-vivo" | "encerrado" | "agendado"
         time — string de exibição (só relevante se "agendado")
   A ordem dos times em cada rodada segue a ordem do chaveamento (o
   vencedor da partida N de uma rodada avança pra partida N/2 da
   próxima) — isso é só cosmético aqui, não há lógica de avanço
   automático ainda.
   =================================================================== */
const CAMPEONATOS = [
  {
    id: "vct-americas-2026",
    name: "VCT Américas — Etapa Final",
    game: "valorant", gameLabel: "Valorant",
    status: "ao-vivo", prizePool: "US$ 1.000.000",
    rounds: [
      {
        label: "Quartas de Final",
        matches: [
          { teamA: { name: "FURIA", seed: 1, logoSeed: "FU" }, teamB: { name: "LOUD", seed: 8, logoSeed: "LO" }, scoreA: 2, scoreB: 1, status: "encerrado" },
          { teamA: { name: "MIBR", seed: 4, logoSeed: "MI" }, teamB: { name: "Leviatán", seed: 5, logoSeed: "LV" }, scoreA: 0, scoreB: 2, status: "encerrado" },
          { teamA: { name: "KRÜ Esports", seed: 3, logoSeed: "KR" }, teamB: { name: "NRG", seed: 6, logoSeed: "NR" }, scoreA: 1, scoreB: 1, status: "ao-vivo" },
          { teamA: { name: "Sentinels", seed: 2, logoSeed: "SN" }, teamB: { name: "2Game", seed: 7, logoSeed: "2G" }, scoreA: null, scoreB: null, status: "agendado", time: "Hoje, 19h00" },
        ],
      },
      {
        label: "Semifinal",
        matches: [
          { teamA: { name: "FURIA", seed: 1, logoSeed: "FU" }, teamB: { name: "Leviatán", seed: 5, logoSeed: "LV" }, scoreA: null, scoreB: null, status: "agendado", time: "Amanhã, 16h00" },
          { teamA: null, teamB: null, scoreA: null, scoreB: null, status: "agendado", time: "Amanhã, 19h00" },
        ],
      },
      {
        label: "Grande Final",
        matches: [
          { teamA: null, teamB: null, scoreA: null, scoreB: null, status: "agendado", time: "Domingo, 17h00" },
        ],
      },
    ],
  },
  {
    id: "cblol-2026-split2",
    name: "CBLOL — Split 2, Playoffs",
    game: "lol", gameLabel: "League of Legends",
    status: "em-breve", prizePool: "R$ 500.000",
    rounds: [
      {
        label: "Quartas de Final",
        matches: [
          { teamA: { name: "paiN Gaming", seed: 1, logoSeed: "PG" }, teamB: { name: "RED Canids", seed: 8, logoSeed: "RC" }, scoreA: null, scoreB: null, status: "agendado", time: "Sáb, 14h00" },
          { teamA: { name: "LOUD", seed: 4, logoSeed: "LO" }, teamB: { name: "Fluxo", seed: 5, logoSeed: "FX" }, scoreA: null, scoreB: null, status: "agendado", time: "Sáb, 16h30" },
          { teamA: { name: "Vivo Keyd", seed: 3, logoSeed: "VK" }, teamB: { name: "Flamengo", seed: 6, logoSeed: "FLA" }, scoreA: null, scoreB: null, status: "agendado", time: "Dom, 14h00" },
          { teamA: { name: "Isurus", seed: 2, logoSeed: "IS" }, teamB: { name: "INTZ", seed: 7, logoSeed: "IZ" }, scoreA: null, scoreB: null, status: "agendado", time: "Dom, 16h30" },
        ],
      },
      { label: "Semifinal", matches: [
        { teamA: null, teamB: null, scoreA: null, scoreB: null, status: "agendado", time: "A definir" },
        { teamA: null, teamB: null, scoreA: null, scoreB: null, status: "agendado", time: "A definir" },
      ]},
      { label: "Grande Final", matches: [
        { teamA: null, teamB: null, scoreA: null, scoreB: null, status: "agendado", time: "A definir" },
      ]},
    ],
  },
  {
    id: "iem-major-2025",
    name: "IEM Major — Playoffs",
    game: "cs2", gameLabel: "CS2",
    status: "encerrado", prizePool: "US$ 1.250.000",
    rounds: [
      { label: "Semifinal", matches: [
        { teamA: { name: "FURIA", seed: 1, logoSeed: "FU" }, teamB: { name: "NAVI", seed: 4, logoSeed: "NV" }, scoreA: 2, scoreB: 1, status: "encerrado" },
        { teamA: { name: "Vitality", seed: 2, logoSeed: "VT" }, teamB: { name: "G2", seed: 3, logoSeed: "G2" }, scoreA: 2, scoreB: 0, status: "encerrado" },
      ]},
      { label: "Grande Final", matches: [
        { teamA: { name: "FURIA", seed: 1, logoSeed: "FU" }, teamB: { name: "Vitality", seed: 2, logoSeed: "VT" }, scoreA: 1, scoreB: 3, status: "encerrado" },
      ]},
    ],
  },
];
