// Tavla (bgammon) entegrasyon yardımcıları.
// Oyuncular self-host bgammon sunucusuna, portalın atadığı kullanıcı adıyla misafir girer;
// maç bitince sunucudaki yama /api/bgammon/webhook'a kazanan kullanıcı adını POST eder.

// Ad → ascii kullanıcı adı: "Okan Tok" (id 13) -> "okan13"
export function assignedUsername(participant) {
  const first = participant.full_name.trim().split(/\s+/)[0].toLowerCase();
  const ascii = first
    .replaceAll("ç", "c").replaceAll("ğ", "g").replaceAll("ı", "i")
    .replaceAll("ö", "o").replaceAll("ş", "s").replaceAll("ü", "u")
    .replace(/[^a-z0-9]/g, "");
  return `${ascii || "oyuncu"}${participant.id}`;
}
