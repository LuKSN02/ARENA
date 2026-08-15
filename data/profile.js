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
  // Catálogo canônico — mesmos 14 emblemas (id/nome/emoji/raridade) do
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

  global.ArenaProfile = {
    profileKey, loadProfile, saveProfilePatch,
    inventoryKey, loadInventoryList, saveInventoryList,
    EMBLEM_CATALOG, MAX_EQUIPPED_BADGES, normalizeEquippedBadges,
  };
})(window);
