/* ===================================================================
   ARENA — PROFILE.JS
   Módulo compartilhado de perfil, inventário e emblemas equipáveis.

   Antes essas mesmas ~45 linhas (loadProfile, saveProfilePatch,
   inventoryKey, loadInventoryList, saveInventoryList, EMBLEM_CATALOG,
   MAX_EQUIPPED_BADGES, normalizeEquippedBadges) existiam copiadas byte
   a byte em index.html e loja.html — o que já tinha causado o catálogo
   de emblemas divergir entre os dois arquivos (loja.html tinha 3
   emblemas — "emblema-guardiao-arena", "emblema-lenda-viva",
   "emblema-sombra-arena" — que nunca existiram no catálogo mestre de
   inventario.html, ou seja, itens que nenhum jogador conseguia
   realmente possuir). EMBLEM_CATALOG aqui é a mesma fonte usada por
   inventario.html (data/inventario CATALOG, itens type:"emblema").

   Requer data/utils.js carregado ANTES deste script (usa
   ArenaUtils.readJSON/writeJSON).

   Carregar em qualquer página que precise ler/escrever perfil,
   inventário ou emblemas equipados (hoje: index.html, loja.html —
   candidatas naturais no futuro: inventario.html, perfil-config.html):
     <script src="data/utils.js"></script>
     <script src="data/profile.js"></script>
     <script src="data/social.js"></script>

   Uso:
     const { loadProfile, saveProfilePatch, loadInventoryList,
             saveInventoryList, normalizeEquippedBadges,
             EMBLEM_CATALOG, MAX_EQUIPPED_BADGES } = window.ArenaProfile;
   =================================================================== */
(function (global) {
  "use strict";

  if (!global.ArenaUtils) {
    console.error("ArenaProfile: data/utils.js precisa ser carregado antes de data/profile.js");
  }
  const { readJSON, writeJSON } = global.ArenaUtils || {};

  // ===== PERFIL =====
  function profileKey(email) { return `arena-profile-${email || "demo"}`; }

  function loadProfile(email) {
    return readJSON(profileKey(email), null);
  }

  function saveProfilePatch(email, patch) {
    const profile = readJSON(profileKey(email), {});
    writeJSON(profileKey(email), { ...profile, ...patch });
  }

  // ===== INVENTÁRIO =====
  function inventoryKey(email) { return `arena-inventory-${email || "demo"}`; }

  function loadInventoryList(email) {
    return readJSON(inventoryKey(email), []);
  }

  function saveInventoryList(email, inv) {
    writeJSON(inventoryKey(email), inv);
  }

  // ===== EMBLEMAS =====
  // Catálogo canônico — mesmos emblemas (id/nome/emoji/raridade) do
  // CATALOG (itens type:"emblema") em inventario.html. Só metadados de
  // exibição ficam aqui; posse real do item continua em
  // arena-inventory-<email>, lido/escrito pelas funções acima.
  const MAX_EQUIPPED_BADGES = 3;
  const EMBLEM_CATALOG = {
    "emblema-primeira-vitoria": { name: "Primeira Vitória", emoji: "⭐", rarity: "comum" },
    "emblema-cacador-noticias": { name: "Caçador de Notícias", emoji: "📰", rarity: "raro" },
    "emblema-comentarista": { name: "Comentarista da Arena", emoji: "💬", rarity: "raro" },
    "emblema-estrategista": { name: "Estrategista", emoji: "🧠", rarity: "raro" },
    "emblema-coracao-roxo": { name: "Coração Roxo", emoji: "💜", rarity: "epico" },
    "emblema-veterano": { name: "Veterano da Arena", emoji: "🎖️", rarity: "epico" },
    "emblema-popular": { name: "Emblema Popular", emoji: "⭐", rarity: "raro" },
    "emblema-fa-fundador": { name: "Fã Fundador", emoji: "🏆", rarity: "lendario" },
    "emblema-arena-vip": { name: "Emblema VIP Arena", emoji: "👑", rarity: "lendario" },
    "emblema-cacador-lendas": { name: "Emblema Caçador de Lendas", emoji: "🐉", rarity: "epico" },
    "emblema-fundador-cosmico": { name: "Emblema Fundador Cósmico", emoji: "🌌", rarity: "lendario" },
    "emblema-mestre-arena": { name: "Emblema Mestre da Arena", emoji: "🎯", rarity: "lendario" },
    "emblema-fenix-renascida": { name: "Emblema Fênix Renascida", emoji: "🔥", rarity: "epico" },
    "emblema-criador": { name: "Criador", emoji: "🛠️", rarity: "lendario" },
    "emblema-guardiao-arena": { name: "Emblema Guardião da Arena", emoji: "🛡️", rarity: "epico" },
    "emblema-lenda-viva": { name: "Emblema Lenda Viva", emoji: "⚡", rarity: "lendario" },
    "emblema-sombra-arena": { name: "Emblema Sombra da Arena", emoji: "🌑", rarity: "epico" },
  };

  // Se por algum motivo (dado antigo, teste, etc.) houver mais emblemas
  // equipados do que o limite permite, apara o excesso automaticamente
  // aqui — assim a poluição visual se resolve sozinha, sem precisar
  // que o usuário clique em nada. Também mantém profile.equippedBadges
  // sincronizado com o inventário (fonte da verdade).
  function normalizeEquippedBadges(email) {
    const inv = loadInventoryList(email);
    let count = 0;
    let changed = false;
    inv.forEach(i => {
      if (i.equipped && EMBLEM_CATALOG[i.id]) {
        count++;
        if (count > MAX_EQUIPPED_BADGES) { i.equipped = false; changed = true; }
      }
    });
    if (changed) saveInventoryList(email, inv);
    const equippedBadges = inv.filter(i => i.equipped && EMBLEM_CATALOG[i.id]).map(i => ({ id: i.id, ...EMBLEM_CATALOG[i.id] }));
    saveProfilePatch(email, { equippedBadges });
    return inv;
  }

  // ===== RARIDADE (resumo enxuto do catálogo, só id → raridade) =====
  // Usado por páginas que precisam calcular XP/pontuação a partir da
  // raridade de itens possuídos (perfil.html, ranking.html) sem
  // carregar o CATALOG inteiro de inventario.html (nome/desc/emoji/
  // condição de desbloqueio — informação que essas páginas não usam).
  // Antes esse objeto vinha copiado byte a byte nos dois arquivos —
  // qualquer item novo no catálogo (loja ou conquista) exigia lembrar
  // de atualizar as duas cópias manualmente, e era fácil uma ficar
  // pra trás (foi exatamente isso que aconteceu com os emblemas
  // guardiao-arena/lenda-viva/sombra-arena antes de entrarem aqui).
  const ITEM_RARITY_LOOKUP = {
    "banner-neon-grade": "comum", "banner-sinal-ao-vivo": "raro", "banner-chamas-furia": "raro",
    "banner-nebulosa-roxa": "epico", "banner-aurora-cyber": "lendario", "emblema-primeira-vitoria": "comum",
    "emblema-cacador-noticias": "raro", "emblema-comentarista": "raro", "emblema-estrategista": "raro",
    "emblema-coracao-roxo": "epico", "emblema-veterano": "epico", "emblema-fa-fundador": "lendario",
    "moldura-cyber-digital": "epico", "moldura-ouro-elite": "lendario", "moldura-neon-glitch": "epico",
    "banner-perfil-nebulosa": "epico", "banner-perfil-campeao": "epico", "banner-perfil-tempestade": "epico",
    "banner-perfil-vaporwave": "epico", "moldura-plasma-arena": "lendario", "moldura-gelo-eterno": "epico",
    "emblema-arena-vip": "lendario", "emblema-cacador-lendas": "epico", "emblema-fundador-cosmico": "lendario",
    "banner-perfil-oceano-digital": "epico", "banner-perfil-aurora-verde": "epico", "emblema-mestre-arena": "lendario",
    "emblema-fenix-renascida": "epico", "cupom-loja-10": "comum", "cupom-chat-vip": "raro", "emblema-popular": "raro",
    "emblema-guardiao-arena": "epico", "emblema-lenda-viva": "lendario", "emblema-sombra-arena": "epico",
  };

  global.ArenaProfile = {
    profileKey, loadProfile, saveProfilePatch,
    inventoryKey, loadInventoryList, saveInventoryList,
    EMBLEM_CATALOG, MAX_EQUIPPED_BADGES, normalizeEquippedBadges,
    ITEM_RARITY_LOOKUP,
  };
})(window);
