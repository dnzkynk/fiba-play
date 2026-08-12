"use client";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Label } from "@/components/ui/input";

// ISO 3166-1 alpha-2 — adlar Intl.DisplayNames ile izleyenin dilinde üretilir
const DIAL = { AD:"376",AE:"971",AF:"93",AG:"1268",AL:"355",AM:"374",AO:"244",AR:"54",AT:"43",AU:"61",AZ:"994",BA:"387",BB:"1246",BD:"880",BE:"32",BF:"226",BG:"359",BH:"973",BI:"257",BJ:"229",BN:"673",BO:"591",BR:"55",BS:"1242",BT:"975",BW:"267",BY:"375",BZ:"501",CA:"1",CD:"243",CF:"236",CG:"242",CH:"41",CI:"225",CL:"56",CM:"237",CN:"86",CO:"57",CR:"506",CU:"53",CV:"238",CY:"357",CZ:"420",DE:"49",DJ:"253",DK:"45",DM:"1767",DO:"1809",DZ:"213",EC:"593",EE:"372",EG:"20",ER:"291",ES:"34",ET:"251",FI:"358",FJ:"679",FM:"691",FR:"33",GA:"241",GB:"44",GD:"1473",GE:"995",GH:"233",GM:"220",GN:"224",GQ:"240",GR:"30",GT:"502",GW:"245",GY:"592",HN:"504",HR:"385",HT:"509",HU:"36",ID:"62",IE:"353",IL:"972",IN:"91",IQ:"964",IR:"98",IS:"354",IT:"39",JM:"1876",JO:"962",JP:"81",KE:"254",KG:"996",KH:"855",KI:"686",KM:"269",KN:"1869",KP:"850",KR:"82",KW:"965",KZ:"7",LA:"856",LB:"961",LC:"1758",LI:"423",LK:"94",LR:"231",LS:"266",LT:"370",LU:"352",LV:"371",LY:"218",MA:"212",MC:"377",MD:"373",ME:"382",MG:"261",MH:"692",MK:"389",ML:"223",MM:"95",MN:"976",MR:"222",MT:"356",MU:"230",MV:"960",MW:"265",MX:"52",MY:"60",MZ:"258",NA:"264",NE:"227",NG:"234",NI:"505",NL:"31",NO:"47",NP:"977",NR:"674",NZ:"64",OM:"968",PA:"507",PE:"51",PG:"675",PH:"63",PK:"92",PL:"48",PT:"351",PW:"680",PY:"595",QA:"974",RO:"40",RS:"381",RU:"7",RW:"250",SA:"966",SB:"677",SC:"248",SD:"249",SE:"46",SG:"65",SI:"386",SK:"421",SL:"232",SM:"378",SN:"221",SO:"252",SR:"597",SS:"211",ST:"239",SV:"503",SY:"963",SZ:"268",TD:"235",TG:"228",TH:"66",TJ:"992",TL:"670",TM:"993",TN:"216",TO:"676",TR:"90",TT:"1868",TV:"688",TW:"886",TZ:"255",UA:"380",UG:"256",US:"1",UY:"598",UZ:"998",VC:"1784",VE:"58",VN:"84",VU:"678",WS:"685",XK:"383",YE:"967",ZA:"27",ZM:"260",ZW:"263" };
const flagOf = (cc) => String.fromCodePoint(...[...cc].map((c) => 0x1f1a5 + c.charCodeAt(0)));

const COUNTRY_CODES = "AD AE AF AG AL AM AO AR AT AU AZ BA BB BD BE BF BG BH BI BJ BN BO BR BS BT BW BY BZ CA CD CF CG CH CI CL CM CN CO CR CU CV CY CZ DE DJ DK DM DO DZ EC EE EG ER ES ET FI FJ FM FR GA GB GD GE GH GM GN GQ GR GT GW GY HN HR HT HU ID IE IL IN IQ IR IS IT JM JO JP KE KG KH KI KM KN KP KR KW KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MG MH MK ML MM MN MR MT MU MV MW MX MY MZ NA NE NG NI NL NO NP NR NZ OM PA PE PG PH PK PL PT PW PY QA RO RS RU RW SA SB SC SD SE SG SI SK SL SM SN SO SR SS ST SV SY SZ TD TG TH TJ TL TM TN TO TR TT TV TW TZ UA UG US UY UZ VC VE VN VU WS XK YE ZA ZM ZW".split(" ");

export function ApplyForm({ labels, lang }) {
  const [f, setF] = useState({ fullName: "", email: "", country: "", company: "" });
  const [dialIso, setDialIso] = useState("TR");
  const [phoneNum, setPhoneNum] = useState("");
  const [password, setPassword] = useState("");
  const [state, setState] = useState("idle"); // idle | busy | done
  const [error, setError] = useState("");

  const countries = useMemo(() => {
    try {
      const dn = new Intl.DisplayNames([lang === "en" ? "en" : "tr"], { type: "region" });
      return COUNTRY_CODES
        .map((c) => ({ code: c, name: dn.of(c) ?? c }))
        .sort((a, b) => a.name.localeCompare(b.name, lang === "en" ? "en" : "tr"));
    } catch {
      return COUNTRY_CODES.map((c) => ({ code: c, name: c }));
    }
  }, [lang]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  // Ülke seçilince alan kodu da o ülkeye geçer (elle yine değiştirilebilir)
  const setCountry = (e) => {
    const name = e.target.value;
    setF({ ...f, country: name });
    const hit = countries.find((c) => c.name === name);
    if (hit && DIAL[hit.code]) setDialIso(hit.code);
  };
  const setPhoneNum2 = (e) => setPhoneNum(e.target.value.replace(/[^\d\s]/g, "").slice(0, 16));

  async function submit(e) {
    e.preventDefault();
    setError("");
    const clean = Object.fromEntries(Object.entries(f).map(([k, v]) => [k, v.trim()]));
    const digits = phoneNum.replace(/\D/g, "");
    if (Object.values(clean).some((v) => !v) || !digits) return setError(labels.err);
    if (clean.fullName.length < 5 || !clean.fullName.includes(" ")) return setError(labels.nameErr);
    if (digits.length < 6 || digits.length > 13) return setError(labels.phoneErr);
    if (password.length < 6) return setError(labels.passErr);
    clean.phone = "+" + DIAL[dialIso] + " " + phoneNum.trim();
    clean.password = password;
    setState("busy");
    const res = await fetch("/api/apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(clean),
    });
    if (res.ok) return setState("done");
    const data = await res.json().catch(() => ({}));
    setState("idle");
    if (res.status === 429) return setError(labels.rate);
    setError(res.status === 409 ? (data.error === "dupe-phone" ? labels.dupePhone : labels.dupe) : labels.err);
  }

  if (state === "done") {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-10 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-2xl">✓</div>
        <p className="text-lg font-semibold text-emerald-800">{labels.done}</p>
        <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-emerald-700">{labels.doneSub}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bn">{labels.fullName} <span className="text-red-500">*</span></Label>
        <Input id="bn" value={f.fullName} onChange={set("fullName")} required maxLength={100}
          autoComplete="name" autoFocus placeholder={labels.namePh} />
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="be">{labels.email} <span className="text-red-500">*</span></Label>
          <Input id="be" type="email" value={f.email} onChange={set("email")} required
            autoComplete="email" placeholder="ad.soyad@fiba.com" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bp">{labels.phone} <span className="text-red-500">*</span></Label>
          <div className="flex gap-2">
            <Select value={dialIso} onChange={(e) => setDialIso(e.target.value)} className="w-32 shrink-0" aria-label="Alan kodu">
              {countries.filter((c) => DIAL[c.code]).map((c) => (
                <option key={c.code} value={c.code} title={c.name}>{flagOf(c.code)} +{DIAL[c.code]}</option>
              ))}
            </Select>
            <Input id="bp" type="tel" inputMode="tel" value={phoneNum} onChange={setPhoneNum2} required
              className="flex-1" autoComplete="tel-national" placeholder={labels.phonePh} />
          </div>
        </div>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bc">{labels.country} <span className="text-red-500">*</span></Label>
          <Select id="bc" value={f.country} onChange={setCountry} required>
            <option value="" disabled>{labels.countryPh}</option>
            {countries.map((c) => <option key={c.code} value={c.name}>{c.name}</option>)}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bs">{labels.company} <span className="text-red-500">*</span></Label>
          <Input id="bs" value={f.company} onChange={set("company")} required maxLength={80}
            autoComplete="organization" placeholder={labels.companyPh} />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="bpw">{labels.password} <span className="text-red-500">*</span></Label>
        <Input id="bpw" type="password" value={password} required minLength={6} maxLength={40}
          onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="••••••" />
        <span className="text-xs text-stone-400">{labels.passHint}</span>
      </div>
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}
      <Button type="submit" size="lg" className="w-full" disabled={state === "busy"}>
        {state === "busy" ? labels.sending : labels.submit}
      </Button>
    </form>
  );
}
