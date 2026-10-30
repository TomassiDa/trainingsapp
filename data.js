// Schema: oefeningen en trainingsdagen.
// Een blok bestaat uit groepen. Een groep met 2 oefeningen is een superset:
// je wisselt per set af. Een groep met 1 oefening doe je gewoon na elkaar.

const EXERCISES = {
  bench: { name: 'Bench press', img: 'bench', unit: 'kg', muscles: 'Borst, triceps, voorste schouder', cue: 'Schouderbladen in en omlaag, ellebogen op ongeveer 45 graden. Onderin 1 tel stil, niet stuiteren.' },
  pullups: { name: 'Pull-ups', img: 'pullups', unit: 'bw', muscles: 'Lats, bovenrug, biceps', cue: 'Start uit een volledige dead hang. Borst naar de bar, ellebogen naar je heupen.' },
  incline: { name: 'Incline press', img: 'incline', unit: 'kg', muscles: 'Bovenborst, voorste schouder, triceps', cue: 'Bankje op 30-45 graden. Bovenin niet tegen elkaar tikken, zodat de spanning blijft.' },
  row: { name: 'Single-arm row', img: 'row', unit: 'kg', perSide: true, muscles: 'Lats, bovenrug, achterste schouder, biceps', cue: 'Hand en knie op het bankje, rug plat. Elleboog naar je heup, bovenin 1 tel vasthouden.' },
  arnold: { name: 'Arnold press', img: 'arnold', unit: 'kg', muscles: 'Voor- en zijkant schouder, triceps', cue: 'Zittend. Start met handpalmen naar je toe op kinhoogte en draai naar buiten tijdens het drukken.' },
  revfly: { name: 'Reverse fly', img: 'revfly', unit: 'kg', muscles: 'Achterste schouder, bovenrug', cue: 'Borst op het bankje op 45 graden, lichte buiging in de ellebogen. Knijp je schouderbladen samen.' },
  pushups: { name: 'Push-ups', img: 'pushups', unit: 'bw', muscles: 'Borst, triceps, core', cue: 'Lichaam in een rechte lijn, tempo 2-0-1. Stop als je vorm breekt.' },
  kneeraise: { name: 'Hanging knee raise', img: 'kneeraise', unit: 'bw', muscles: 'Onderbuik, heupbuigers', cue: 'Knieen naar je borst en bekken kantelen. Niet zwaaien.' },
  chinups: { name: 'Chin-ups', img: 'chinups', unit: 'bw', muscles: 'Biceps, lats, bovenrug', cue: 'Onderhandse greep op schouderbreedte, 3 tellen omlaag. Onderin volledig strekken.' },
  dips: { name: 'Dips', img: 'dips', unit: 'bw', muscles: 'Onderborst, triceps, voorste schouder', cue: 'Romp ongeveer 30 graden voorover. Zak tot je bovenarm parallel is, zonder je schouders te forceren.' },
  csrow: { name: 'Chest-supported row', img: 'csrow', unit: 'kg', muscles: 'Middenrug, rhomboids, achterste schouder', cue: 'Buik op het bankje op 30-45 graden. Roei naar je heupen en knijp je schouderbladen samen.' },
  fly: { name: 'Chest fly', img: 'fly', unit: 'kg', muscles: 'Borst, voorste schouder', cue: 'Lichte buiging in de ellebogen. Onderin 2 tellen rek, dan in een boog omhoog.' },
  lateral: { name: 'Lateral raise', img: 'lateral', unit: 'kg', muscles: 'Zijkant schouder', cue: 'Til tot schouderhoogte, pinken iets hoger dan duimen. Laatste set: drop naar 2 kg tot falen.' },
  inclinecurl: { name: 'Incline curl', img: 'inclinecurl', unit: 'kg', muscles: 'Biceps (lange kop)', cue: 'Bankje op 45 graden, armen volledig hangend. 3 tellen omlaag.' },
  skull: { name: 'Skull crusher', img: 'skull', unit: 'kg', muscles: 'Triceps', cue: 'Ellebogen smal en stil. Laat de dumbbells gecontroleerd naast je hoofd zakken.' },
  hammer: { name: 'Hammer curl', img: 'hammer', unit: 'kg', muscles: 'Brachialis, onderarmen, biceps', cue: 'Duimen omhoog, ellebogen tegen je zij. Geen momentum.' },
  ohext: { name: 'Overhead extension', img: 'ohext', unit: 'kg', muscles: 'Triceps (lange kop)', cue: 'Een dumbbell met beide handen boven je hoofd. Core aan, geen holle rug.' },
  goblet: { name: 'Goblet squat', img: 'goblet', unit: 'kg', muscles: 'Quadriceps, bilspieren, core', cue: 'Dumbbell tegen je borst, 3 tellen omlaag. Ellebogen raken je knieen, borst omhoog.' },
  rdl: { name: 'Romanian deadlift', img: 'rdl', unit: 'kg', muscles: 'Hamstrings, bilspieren, onderrug', cue: 'Knieen licht gebogen, heupen naar achteren met een platte rug. Zak tot je rek voelt.' },
  curl: { name: 'Bicep curl', img: 'curl', unit: 'kg', muscles: 'Biceps, onderarmen', cue: 'Ellebogen stil tegen je zij. Knijp bovenin, 4 tellen omlaag.' },
  closegrip: { name: 'Close-grip press', img: 'closegrip', unit: 'kg', muscles: 'Triceps, binnenkant borst', cue: 'Dumbbells de hele set tegen elkaar drukken, ellebogen dicht langs je lichaam.' },
  conc: { name: 'Concentration curl', img: 'conc', unit: 'kg', perSide: true, muscles: 'Biceps (korte kop)', cue: 'Elleboog tegen de binnenkant van je dij. Onderin volledig strekken.' },
  kickback: { name: 'Tricep kickback', img: 'kickback', unit: 'kg', muscles: 'Triceps', cue: 'Bovenarm stil en parallel aan de vloer. Strek volledig en houd 1 tel vast.' },
  legraise: { name: 'Hanging leg raise', img: 'legraise', unit: 'bw', muscles: 'Onderbuik, heupbuigers, grip', cue: 'Benen zo gestrekt mogelijk tot heuphoogte, traag omlaag. Lukt 8 niet, buig dan je knieen.' },
  russian: { name: 'Russian twist', img: 'russian', unit: 'kg', muscles: 'Schuine buikspieren, core', cue: 'Voeten los van de grond, rug recht. Draai vanuit je romp. 20 is totaal, links en rechts samen.' },
};

const WARMUP = [
  { name: 'Jumping jacks', amount: '2 min', seconds: 120 },
  { name: 'Arm circles', amount: '1 min', seconds: 60 },
  { name: 'Push-ups', amount: '2 x 10' },
  { name: 'Dead hang aan de bar', amount: '2 x 30 s', seconds: 30 },
  { name: 'Lichte set van de eerste oefening', amount: '1 set' },
];

// it(ex, code, sets, reps, kg, extra)
function it(ex, code, sets, reps, kg, extra) {
  return Object.assign({ ex: ex, code: code, sets: sets, reps: reps, kg: kg }, extra || {});
}

const DAYS = [
  {
    id: 'd1', label: 'Dag 1', name: 'Upper A', focus: 'Kracht: borst en rug', minutes: 60, color: '#C8F53C',
    blocks: [
      { name: 'Blok A · Kracht', groups: [ { rest: 90, items: [ it('bench', 'A1', 4, '6-8', 15, { tempo: '3-1-1' }), it('pullups', 'A2', 4, '5-8', 0, { tempo: '3 tellen omlaag' }) ] } ] },
      { name: 'Blok B · Hypertrofie', groups: [
        { rest: 70, items: [ it('incline', 'B1', 3, '8-10', 15, { tempo: '3-0-1' }), it('row', 'B2', 3, '10', 15) ] },
        { rest: 70, items: [ it('arnold', 'B3', 3, '10-12', 10), it('revfly', 'B4', 3, '15', 5) ] },
      ] },
      { name: 'Blok C · Finisher', groups: [ { rest: 45, items: [ it('pushups', 'C1', 2, 'max', 0), it('kneeraise', 'C2', 3, '12-15', 0) ] } ] },
    ],
  },
  {
    id: 'd2', label: 'Dag 2', name: 'Upper B', focus: 'Hypertrofie: borst, rug en armen', minutes: 60, color: '#4C8DFF',
    blocks: [
      { name: 'Blok A · Compound', groups: [ { rest: 75, items: [ it('chinups', 'A1', 4, '8-10', 0), it('dips', 'A2', 4, '8-12', 0) ] } ] },
      { name: 'Blok B · Hypertrofie', groups: [
        { rest: 70, items: [ it('csrow', 'B1', 3, '12', 15), it('fly', 'B2', 3, '12-15', 10) ] },
        { rest: 60, items: [ it('lateral', 'B3', 3, '12-15', 5) ] },
      ] },
      { name: 'Blok C · Armen', groups: [ { rest: 60, items: [ it('inclinecurl', 'C1', 3, '10-12', 10), it('skull', 'C2', 3, '10-12', 10) ] } ] },
      { name: 'Blok D · Burnout', groups: [ { rest: 40, items: [ it('hammer', 'D1', 2, '15', 10), it('ohext', 'D2', 2, '15', 10) ] } ] },
    ],
  },
  {
    id: 'd3', label: 'Dag 3', name: 'Bonus', focus: 'Armen, core en minimaal benen', minutes: 40, color: '#FF9F43', optional: true,
    blocks: [
      { name: 'Blok A · Benen', groups: [ { rest: 70, items: [ it('goblet', 'A1', 3, '12-15', 15), it('rdl', 'A2', 3, '12', 15) ] } ] },
      { name: 'Blok B · Armen', groups: [
        { rest: 90, items: [ it('curl', 'B1', 3, '6-8', 15), it('closegrip', 'B2', 3, '8-10', 15) ] },
        { rest: 50, items: [ it('conc', 'B3', 2, '12', 10), it('kickback', 'B4', 2, '12-15', 10) ] },
      ] },
      { name: 'Blok C · Core', groups: [ { rest: 45, items: [ it('legraise', 'C1', 3, '8-12', 0), it('russian', 'C2', 3, '20', 10) ] } ] },
    ],
  },
];
