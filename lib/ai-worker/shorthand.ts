const CAR_MAKES: Record<string, string> = {
  t:    'Toyota',    toy:  'Toyota',
  n:    'Nissan',    nis:  'Nissan',
  h:    'Honda',     hon:  'Honda',
  b:    'BMW',
  mb:   'Mercedes-Benz', mer: 'Mercedes-Benz', benz: 'Mercedes-Benz',
  f:    'Ford',
  ch:   'Chevrolet', chev: 'Chevrolet',
  vw:   'Volkswagen',
  a:    'Audi',      aud:  'Audi',
  hd:   'Hyundai',   hyn:  'Hyundai',
  kia:  'Kia',
  mz:   'Mazda',     maz:  'Mazda',
  sb:   'Subaru',    sub:  'Subaru',
  ts:   'Tesla',     tel:  'Tesla',
  gmc:  'GMC',
  l:    'Lexus',     lex:  'Lexus',
  j:    'Jeep',
  d:    'Dodge',     dod:  'Dodge',
};

const CAR_MODELS: Record<string, string> = {
  cam:  'Camry',         camry:  'Camry',
  cor:  'Corolla',       co:     'Corolla',
  rav:  'RAV4',          rav4:   'RAV4',
  hl:   'Highlander',    high:   'Highlander',
  lc:   'Land Cruiser',
  hi:   'Hilux',         hil:    'Hilux',
  pr:   'Prado',         prd:    'Prado',
  ya:   'Yaris',         yar:    'Yaris',
  for:  'Fortuner',      fort:   'Fortuner',
  tac:  'Tacoma',        tun:    'Tundra',
  seq:  'Sequoia',       fj:     'FJ Cruiser',
  alt:  'Altima',
  pt:   'Patrol',        pat:    'Patrol',
  pss:  'Patrol Super Safari',
  sen:  'Sentra',
  path: 'Pathfinder',    pf:     'Pathfinder',
  pick: 'Pickup',        frt:    'Frontier',
  rog:  'Rogue',         vtec:   'v-tec',
  arm:  'Armada',        nv:     'NV3500',
  acc:  'Accord',        civ:    'Civic',
  crv:  'CR-V',          pil:    'Pilot',
  s3:   '3 Series',      s5:     '5 Series',
  x3:   'X3',            x5:     'X5',
  cc:   'C-Class',       ec:     'E-Class',
  gle:  'GLE',           gls:    'GLS',
  f150: 'F-150',         mus:    'Mustang',
  exp:  'Explorer',      rap:    'Raptor',
  bro:  'Bronco',
  sil:  'Silverado',     equ:    'Equinox',    mal: 'Malibu',
  gol:  'Golf',          pas:    'Passat',     tig: 'Tiguan',
  a4:   'A4',            a6:     'A6',
  q5:   'Q5',            q7:     'Q7',
  ela:  'Elantra',       sf:     'Santa Fe',   tuc: 'Tucson',
  sor:  'Sorento',       spo:    'Sportage',   opt: 'Optima',
  m3:   'Mazda3',        cx5:    'CX-5',
  cx9:  'CX-9',          m6:     'Mazda6',     m2:  'Mazda2',
  imp:  'Impreza',       fores:  'Forester',   out: 'Outback',
  ms:   'Model S',       m3t:    'Model 3',
  mx:   'Model X',       my:     'Model Y',
  sie:  'Sierra',        yuk:    'Yukon',      aca: 'Acadia',
  es:   'ES',  rx: 'RX',  lx: 'LX',  gx: 'GX',  nx: 'NX',  is: 'IS',
  wra:  'Wrangler',      gc:     'Grand Cherokee',  che: 'Cherokee',
  ram:  'Ram',           chr:    'Charger',    dur: 'Durango',
};

const CAR_VARIANTS: Record<string, string> = {
  base:    'Base',
  lx:      'LX',       ex:      'EX',
  sp:      'Sport',    lim:     'Limited',
  pre:     'Premium',  tour:    'Touring',
  se:      'SE',       le:      'LE',      xle:    'XLE',
  sr:      'SR',       trd:     'TRD',
  gt:      'GT',       rt:      'R/T',     sxt:    'SXT',
  gr:      'Gr',       gxr:     'Gxr',
  vx:      'Vx',       vxr:     'Vxr',
  gxrvxr:  'Gxr/Vxr',
  vxs:     'Vxs',
  tt:      'Twin turbo',
  plat:    'Platinum',
  lx470:   'Lx470',   lx570:   'Lx570',   lx600:  'Lx600',
  v8:      'V8',       v6:      'V6',
  std:     'Standard',
  fj100:   'FJ100',   fj200:   'FJ200',
  lc200:   'Lc200',   lc300:   'Lc300',
  z71:     'Z71',      z41:     'Z41',
  '2500':  '2500',    '1500':  '1500',
  sd:      'Single-door',  dd: 'Double-door',
  '4x4':   '4x4',
};

const CAR_COLORS: Record<string, string> = {
  w:    'White',        wh:   'White',
  bl:   'Black',        blk:  'Black',
  gr:   'Gray',         gry:  'Gray',
  si:   'Silver',       sil:  'Silver',
  r:    'Red',          re:   'Red',
  bu:   'Blue',
  g:    'Green',        gn:   'Green',
  br:   'Brown',        brn:  'Brown',
  ch:   'Chrome',
  y:    'Yellow',       ye:   'Yellow',
  o:    'Orange',       or:   'Orange',
  pu:   'Purple',
  go:   'Gold',         gol:  'Gold',
  be:   'Beige',        bei:  'Beige',
  ma:   'Maroon',       mar:  'Maroon',
  na:   'Navy',         nav:  'Navy',
  bur:  'Burgundy',
  te:   'Teal',         tea:  'Teal',
  cp:   'Champagne',    cha:  'Champagne',
  bz:   'Bronze',
  pw:   'Pearl White',
  mib:  'Midnight Blue',
  rr:   'Racing Red',
  fg:   'Forest Green',
  gg:   'Graphite Gray',
  mbl:  'Metallic Black',
};

const PAYMENT_METHODS: Record<string, string> = {
  cash:    'CASH',    c:   'CASH',
  card:    'CARD',    cd:  'CARD',
  bank:    'BANK_TRANSFER',  bt: 'BANK_TRANSFER',
  credit:  'CREDIT',  cr:  'CREDIT',
  cheque:  'CHEQUE',  chq: 'CHEQUE',
};

function resolveMake(raw: string):    string { return CAR_MAKES[raw.toLowerCase()]       ?? raw; }
function resolveModel(raw: string):   string { return CAR_MODELS[raw.toLowerCase()]      ?? raw; }
function resolveVariant(raw: string): string { return CAR_VARIANTS[raw.toLowerCase()]    ?? raw; }
function resolveColor(raw: string):   string { return CAR_COLORS[raw.toLowerCase()]      ?? raw; }
function resolvePayment(raw: string): string { return PAYMENT_METHODS[raw.toLowerCase()] ?? raw.toUpperCase(); }

function normaliseYear(raw: string): number {
  const n = parseInt(raw, 10);
  if (n >= 100) return n;
  return n <= 30 ? 2000 + n : 1900 + n;
}

export function expandShorthand(text: string): string | null {
  const raw    = text.trim();
  const tokens = raw.split(/[\n;]+/).map(t => t.trim()).filter(Boolean);
  if (!tokens.length) return null;

  const first = tokens[0].toLowerCase();

  if (first === 'ns') {
    const parts: string[] = ['Create a new sale with the following details:'];

    for (const tok of tokens.slice(1)) {
      const newCust = tok.match(/^cu<<(.+?),(.+?)>>$/i);
      if (newCust) {
        parts.push(`Create a new customer first: name="${newCust[1].trim()}", phone="${newCust[2].trim()}", then use them for this sale.`);
        continue;
      }
      const existCust = tok.match(/^cu<(.+?)>$/i);
      if (existCust) { parts.push(`Customer: "${existCust[1].trim()}"`); continue; }

      const cat = tok.match(/^c-(.+)$/i);
      if (cat)  { parts.push(`Category hint: ${cat[1].trim()}`); continue; }

      const disc = tok.match(/^d-(\d+(?:\.\d+)?)$/i);
      if (disc) { parts.push(`Discount: ${disc[1]}`); continue; }

      const pm = tok.match(/^pm-(.+)$/i);
      if (pm)   { parts.push(`Payment method: ${resolvePayment(pm[1].trim())}`); continue; }

      const qty = tok.match(/^q-(\d+(?:\.\d+)?)$/i);
      if (qty)  { parts.push(`Quantity: ${qty[1]}`); continue; }

      const prod = tok.match(/^(.+?)-q\((\d+(?:\.\d+)?)\)$/i)
                ?? tok.match(/^(.+?)-(\d+(?:\.\d+)?)$/i);
      if (prod) { parts.push(`Product SKU: "${prod[1].trim()}", quantity: ${prod[2]}`); continue; }

      parts.push(tok);
    }
    return parts.join('\n');
  }

  if (first === 'pu') {
    const parts: string[] = ['Create a new purchase with the following details:'];

    for (const tok of tokens.slice(1)) {
      const newSup = tok.match(/^su<<(.+?),(.+?)>>$/i);
      if (newSup) {
        parts.push(`Create a new supplier first: name="${newSup[1].trim()}", phone="${newSup[2].trim()}", then use them for this purchase.`);
        continue;
      }
      const existSup = tok.match(/^su<(.+?)>$/i);
      if (existSup) { parts.push(`Supplier: "${existSup[1].trim()}"`); continue; }

      const cat = tok.match(/^c-(.+)$/i);
      if (cat)  { parts.push(`Category hint: ${cat[1].trim()}`); continue; }

      const pt = tok.match(/^pt-(.+)$/i);
      if (pt)   { parts.push(`Payment method: ${resolvePayment(pt[1].trim())}`); continue; }

      const prBlock = tok.match(/^pr<(.+)>$/i);
      if (prBlock) {
        for (const item of prBlock[1].split(',')) {
          const m = item.trim().match(/^(.+?)-q\((\d+(?:\.\d+)?)\)$/i)
                 ?? item.trim().match(/^(.+?)-(\d+(?:\.\d+)?)$/i);
          if (m) parts.push(`Product SKU: "${m[1].trim()}", quantity: ${m[2]}`);
          else   parts.push(`Product: "${item.trim()}"`);
        }
        continue;
      }
      parts.push(tok);
    }
    return parts.join('\n');
  }

  if (first === 'np') {
    const parts: string[] = ['Create a new product with the following details:'];

    for (const tok of tokens.slice(1)) {
      const name    = tok.match(/^n-(.+)$/i);
      if (name)    { parts.push(`Product name: "${name[1].trim().toUpperCase()}"`);                       continue; }
      const cat     = tok.match(/^c-(.+)$/i);
      if (cat)     { parts.push(`Category (search get_categories with query="${cat[1].trim()}")`);        continue; }
      const make    = tok.match(/^cr-(.+)$/i);
      if (make)    { parts.push(`Car make: "${resolveMake(make[1].trim())}"`);                            continue; }
      const model   = tok.match(/^cm-(.+)$/i);
      if (model)   { parts.push(`Car model: "${resolveModel(model[1].trim())}"`);                         continue; }
      const variant = tok.match(/^v-(.+)$/i);
      if (variant) { parts.push(`Variant: "${resolveVariant(variant[1].trim())}"`);                       continue; }
      const color   = tok.match(/^col-(.+)$/i);
      if (color)   { parts.push(`Color: "${resolveColor(color[1].trim())}"`);                             continue; }
      const yr      = tok.match(/^y-(\d{2,4})-(\d{2,4})$/i);
      if (yr)      { parts.push(`Year range: ${normaliseYear(yr[1])} to ${normaliseYear(yr[2])}`);        continue; }
      const cp      = tok.match(/^cp-(\d+(?:\.\d+)?)$/i);
      if (cp)      { parts.push(`Cost price: ${cp[1]}`);                                                  continue; }
      const sp      = tok.match(/^sp-(\d+(?:\.\d+)?)$/i);
      if (sp)      { parts.push(`Selling price: ${sp[1]}`);                                               continue; }
      const cs      = tok.match(/^cs-(\d+(?:\.\d+)?)$/i);
      if (cs)      { parts.push(`Opening stock: ${cs[1]}`);                                               continue; }
      parts.push(tok);
    }
    return parts.join('\n');
  }

  return null;
}