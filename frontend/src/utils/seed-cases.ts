export interface SeedCase {
  id: string;
  title: string;
  description: string;
  tags: string[];
}

export const SEED_CASES: SeedCase[] = [
  {
    id: 'rental-deposit',
    title: 'Vrácení nájemní jistoty',
    description: 'Pronajímatel odmítá vrátit nájemní jistotu ve výši 30,000 Kč po ukončení nájmu bytu. Tvrdí, že byt byl poškozen (poškrábaná podlaha, díry ve stěně), ale žádnou fotodokumentaci ani seznam vad nemá. Nájemce má protokol o předání bytu, kde nejsou uvedeny žádné závady. Pronajímatel navíc během nájmu nesložil jistotu na samostatný účet, jak vyžaduje zákon.',
    tags: ['Nájemní právo', 'Bezdůvodné obohacení']
  },
  {
    id: 'inheritance-dispute',
    title: 'Dědické vypořádání',
    description: 'Otec zemřel a v závěti odkázal rodinný dům v hodnotě 8 milionů Kč nejstaršímu synovi. Ostatní tři děti nebyli v závěti vůbec zmíněni, ale nyní požadují své zákonné dědické podíly. Nejstarší syn argumentuje, že o otce roky pečoval a ostatní sourozenci s ním nemluvili. Dvě z dětí jsou nezletilé, zastoupené matkou. Dům má navíc hypotéku 2 miliony Kč.',
    tags: ['Dědické právo', 'Rodinné právo']
  },
  {
    id: 'defective-product',
    title: 'Vadné zboží a náhrada škody',
    description: 'Zákazník koupil pračku za 25,000 Kč. Po třech měsících používání pračka protekla a zapříčinila zatopení bytu, kde vznikla škoda na podlaze a nábytku ve výši 150,000 Kč. Prodejce uznává vadu pračky a je ochoten vrátit kupní cenu nebo provést výměnu, ale odmítá hradit následné škody. Argumentuje, že není výrobce a nelze ho činit odpovědným za škodu způsobenou vadným výrobkem.',
    tags: ['Kupní smlouva', 'Náhrada škody']
  },
  {
    id: 'breach-of-contract',
    title: 'Nedodání díla',
    description: 'Objednatel uzavřel se zhotovitelem smlouvu o dílo na kompletní rekonstrukci koupelny za 350,000 Kč s termínem dokončení do 60 dnů. Ve smlouvě byla sjednána smluvní pokuta 1,000 Kč za každý den prodlení. Zhotovitel práce nedokončil ani po 120 dnech, dílo je hotovo jen z 60 %, kvalita provedených prací je nevyhovující. Objednatel musel bydlet v náhradním ubytování (náklady 80,000 Kč) a nyní požaduje slevu z ceny, smluvní pokutu a náhradu nákladů na ubytování.',
    tags: ['Smlouva o dílo', 'Smluvní pokuta']
  },
  {
    id: 'easement-dispute',
    title: 'Spor o věcné břemeno',
    description: 'Vlastník pozemku má dlouhodobě přístup ke svému pozemku přes sousední pozemek. Toto věcné břemeno (služebnost) vzniklo před 30 lety písemnou dohodou předchozích vlastníků, ale není zapsáno v katastru nemovitostí. Soused nyní prodal svůj pozemek novému majiteli, který přístupovou cestu zatarasil plotem a požaduje 500,000 Kč za zřízení nového věcného břemena. Původní dohodu o služebnosti se nepodařilo dohledat.',
    tags: ['Věcná práva', 'Služebnost']
  }
];