import { KnowledgeGraph, GraphNode, GraphEdge } from './types';

// Theme Constants (Must match index.html Tailwind config)
export const THEME = {
  colors: {
    background: '#09090b',
    surface: '#0c0c0e',
    zinc900: '#18181b',
    owpGreen: '#355e3b',
    archivalGold: '#b45309',
    crimson: '#be123c',
    textMain: '#f4f4f5',
    textDim: '#a1a1aa'
  }
};

// Historical Keyframes for Timeline
export const TIMELINE_KEYFRAMES = [
  { year: 1893, label: 'Liga', color: '#355e3b' },
  { year: 1897, label: 'SND', color: '#b45309' },
  { year: 1905, label: 'Revol.', color: '#be123c' },
  { year: 1918, label: 'Indep.', color: '#355e3b' },
  { year: 1919, label: 'Versailles', color: '#355e3b' },
  { year: 1926, label: 'Coup', color: '#be123c' },
  { year: 1933, label: 'OWP Ban', color: '#be123c' },
  { year: 1939, label: 'WWII', color: '#000000' }
];

// Merged Data: Full JSON Seed + Regional Expansion
const DATA = {
  "metadata": {
    "title": "Baza Wiedzy o Endecji (Narodowej Demokracji)",
    "description": "Kompleksowa baza wiedzy rozszerzona o ośrodki regionalne.",
    "version": "1.3",
    "updated": "2025-11-23",
  },
  "nodes": [
    // --- USER JSON SEED ---
    {
      "id": "dmowski_roman",
      "label": "Roman Dmowski",
      "type": "person",
      "dates": "1864-1939",
      "description": "Założyciel i główny ideolog Endecji. Twórca Ligi Narodowej (1893), przywódca Komitetu Narodowego Polskiego na konferencji pokojowej w Paryżu (1919). Sygnatariusz Traktatu Wersalskiego. Autor 'Myśli nowoczesnego Polaka' (1903).",
      "region": "Warszawa",
      "importance": 1.0,
      "sources": ["Myśli nowoczesnego Polaka", "Polityka polska i odbudowanie państwa"]
    },
    {
      "id": "poplawski_jan",
      "label": "Jan Ludwik Popławski",
      "type": "person",
      "dates": "1854-1908",
      "description": "Współzałożyciel Ligi Narodowej i główny teoretyk polskiego nacjonalizmu. Redaktor 'Przeglądu Wszechpolskiego' i 'Polaka'.",
      "region": "Warszawa",
      "importance": 0.9,
      "sources": ["Pisma polityczne", "Co to jest naród?"]
    },
    {
      "id": "balicki_zygmunt",
      "label": "Zygmunt Balicki",
      "type": "person",
      "dates": "1858-1916",
      "description": "Ideolog egoizmu narodowego i współzałożyciel Ligi Narodowej. Autor 'Egoizmu narodowego wobec etyki'.",
      "region": "Global",
      "importance": 0.85,
      "sources": ["Egoizm narodowy wobec etyki"]
    },
    {
      "id": "grabski_wladyslaw",
      "label": "Władysław Grabski",
      "type": "person",
      "dates": "1874-1938",
      "description": "Ekonomista i polityk narodowo-demokratyczny. Premier RP (1923-1925). Twórca reformy walutowej.",
      "region": "Warszawa",
      "importance": 0.75
    },
    {
      "id": "grabski_stanislaw",
      "label": "Stanisław Grabski",
      "type": "person",
      "dates": "1871-1949",
      "description": "Ekonomista, polityk narodowy, brat Władysława Grabskiego. Działacz Stronnictwa Narodowego, profesor ekonomii.",
      "region": "Lwów",
      "importance": 0.7
    },
    {
      "id": "mosdorf_jan",
      "label": "Jan Mosdorf",
      "type": "person",
      "dates": "1904-1943",
      "description": "Doktor filozofii i działacz narodowy młodego pokolenia. Przywódca Młodzieży Wszechpolskiej. Zginął w Auschwitz.",
      "region": "Warszawa",
      "importance": 0.65,
      "sources": ["Akademik i polityka"]
    },
    {
      "id": "rybarski_roman",
      "label": "Roman Rybarski",
      "type": "person",
      "dates": "1887-1942",
      "description": "Ekonomista, prawnik i działacz narodowy. Profesor Uniwersytetu Warszawskiego. Zginął w Auschwitz.",
      "region": "Warszawa",
      "importance": 0.7,
      "sources": ["Siła i prawo"]
    },
    {
      "id": "pilsudski_jozef",
      "label": "Józef Piłsudski",
      "type": "person",
      "dates": "1867-1935",
      "description": "RYWAL Dmowskiego. Przywódca obozu sanacyjnego po zamachu majowym 1926. Propagował federalizm.",
      "region": "Wilno",
      "rival": true,
      "importance": 0.95
    },
    {
      "id": "wasilewski_leon",
      "label": "Leon Wasilewski",
      "type": "person",
      "dates": "1870-1936",
      "description": "Polityk i publicysta narodowy, działacz Ligi Narodowej. Specjalista od spraw narodowościowych.",
      "importance": 0.6
    },
    {
      "id": "glabisz_stanislaw",
      "label": "Stanisław Głąbiński",
      "type": "person",
      "dates": "1862-1943",
      "description": "Polityk narodowo-demokratyczny, profesor prawa. Działacz galicyjski Stronnictwa Narodowo-Demokratycznego.",
      "region": "Lwów",
      "importance": 0.5
    },
    {
      "id": "nowaczynski_adolf",
      "label": "Adolf Nowaczyński",
      "type": "person",
      "dates": "1876-1944",
      "description": "Pisarz, dramaturg i publicysta narodowy.",
      "importance": 0.55
    },
    {
      "id": "debicki_ludwik",
      "label": "Ludwik Dębicki",
      "type": "person",
      "dates": "1845-1908",
      "description": "Historyk i publicysta, współpracownik ruchu narodowego.",
      "importance": 0.45
    },
    {
      "id": "paderewski_ignacy",
      "label": "Ignacy Jan Paderewski",
      "type": "person",
      "dates": "1860-1941",
      "description": "Pianista, kompozytor i polityk. Współsygnatariusz Traktatu Wersalskiego.",
      "importance": 0.75
    },
    {
      "id": "stroński_stanisław",
      "label": "Stanisław Stroński",
      "type": "person",
      "dates": "1882-1955",
      "description": "Publicysta i polityk narodowy. Działacz Stronnictwa Narodowego.",
      "importance": 0.55
    },
    {
      "id": "romer_eugeniusz",
      "label": "Eugeniusz Romer",
      "type": "person",
      "dates": "1871-1954",
      "description": "Geograf i kartograf. Współpracował z Dmowskim przy ustalaniu granic Polski.",
      "importance": 0.6
    },
    {
      "id": "seyda_mariano",
      "label": "Marian Seyda",
      "type": "person",
      "dates": "1879-1967",
      "description": "Polityk narodowy z Wielkopolski, minister spraw zagranicznych RP (1923).",
      "region": "Wielkopolska",
      "importance": 0.65
    },
    {
      "id": "giertych_jędrzej",
      "label": "Jędrzej Giertych",
      "type": "person",
      "dates": "1903-1992",
      "description": "Działacz młodego pokolenia narodowego, publicysta. Przywódca ONR.",
      "importance": 0.6
    },
    {
      "id": "doboszynski_adam",
      "label": "Adam Doboszyński",
      "type": "person",
      "dates": "1904-1949",
      "description": "Polityk, pisarz i publicysta. Teoretyk gospodarki narodowej.",
      "importance": 0.6,
      "sources": ["Gospodarka narodowa"]
    },
    {
      "id": "rutkowski_jan",
      "label": "Jan Rutkowski",
      "type": "person",
      "dates": "1886-1949",
      "description": "Historyk gospodarczy, współpracownik ruchu narodowego.",
      "importance": 0.45
    },
    
    // --- ORGANIZATIONS ---
    {
      "id": "liga_narodowa",
      "label": "Liga Narodowa",
      "type": "organization",
      "dates": "1893-1928",
      "description": "Tajna organizacja założona przez Dmowskiego, Popławskiego i Balickiego.",
      "importance": 1.0
    },
    {
      "id": "snd",
      "label": "Stronnictwo Narodowo-Demokratyczne",
      "type": "organization",
      "dates": "1897-1919",
      "description": "Partia Narodowo-Demokratyczna. Jawne skrzydło polityczne Ligi Narodowej.",
      "importance": 0.9
    },
    {
      "id": "komitet_narodowy",
      "label": "Komitet Narodowy Polski",
      "type": "organization",
      "dates": "1917-1919",
      "description": "Prowadzony przez Dmowskiego. Uznany przez aliantów rząd polski.",
      "importance": 0.95
    },
    {
      "id": "stronnictwo_narodowe",
      "label": "Stronnictwo Narodowe",
      "type": "organization",
      "dates": "1928-1939",
      "description": "Partia Narodowa. Zreformowana po zamachu majowym Piłsudskiego.",
      "importance": 0.85
    },
    {
      "id": "owp",
      "label": "Obóz Wielkiej Polski",
      "type": "organization",
      "dates": "1926-1933",
      "description": "Organizacja założona przez Romana Dmowskiego w grudniu 1926 roku. Masowy ruch narodowy.",
      "importance": 0.8
    },
    {
      "id": "mlodziez_wszechpolska",
      "label": "Młodzież Wszechpolska",
      "type": "organization",
      "dates": "1922-1939",
      "description": "Organizacja młodzieżowa ruchu narodowego na uniwersytetach.",
      "importance": 0.75
    },
    {
      "id": "onr",
      "label": "Obóz Narodowo-Radykalny",
      "type": "organization",
      "dates": "1934-1939",
      "description": "Radykalna organizacja narodowa, odłam młodych działaczy.",
      "importance": 0.65
    },
    {
      "id": "nka",
      "label": "Naczelny Komitet Akademicki",
      "type": "organization",
      "dates": "1920s-1930s",
      "description": "Prawny reprezentant i władza ogółu polskiej młodzieży akademickiej.",
      "importance": 0.65
    },
    {
      "id": "cie",
      "label": "Confédération Internationale des Étudiants",
      "type": "organization",
      "description": "Międzynarodowa Konferencja Studentów.",
      "importance": 0.5
    },
    {
      "id": "liga_polska",
      "label": "Liga Polska",
      "type": "organization",
      "dates": "1887-1893",
      "description": "Poprzedniczka Ligi Narodowej.",
      "importance": 0.65
    },

    // --- EVENTS ---
    {
      "id": "zalozenie_ligi",
      "label": "Założenie Ligi Narodowej",
      "type": "event",
      "dates": "1893",
      "description": "Tajne spotkanie w Warszawie. Dmowski, Popławski i Balicki założyli Ligę.",
      "importance": 1.0
    },
    {
      "id": "udzial_w_dumie",
      "label": "Udział w Dumie Rosyjskiej",
      "type": "event",
      "dates": "1906-1917",
      "description": "Członkowie ND wybrani do Dumy Rosyjskiej.",
      "importance": 0.8
    },
    {
      "id": "konferencja_paryska",
      "label": "Konferencja Pokojowa w Paryżu",
      "type": "event",
      "dates": "1919",
      "description": "Dmowski reprezentował Polskę. Zabezpieczył zachodnie granice.",
      "importance": 1.0
    },
    {
      "id": "zamach_majowy",
      "label": "Zamach Majowy",
      "type": "event",
      "dates": "1926-05",
      "description": "Piłsudski przejął władzę. ND sprzeciwiło się zamachowi.",
      "importance": 0.9
    },
    {
      "id": "smierc_dmowskiego",
      "label": "Śmierć Dmowskiego",
      "type": "event",
      "dates": "1939-01-02",
      "description": "Dmowski zmarł w Warszawie 2 stycznia 1939.",
      "importance": 0.85
    },
    {
      "id": "rewolucja_1905",
      "label": "Rewolucja 1905 roku",
      "type": "event",
      "dates": "1905",
      "description": "Dmowski i narodowcy sprzeciwili się rewolucji.",
      "importance": 0.7
    },
    {
      "id": "powstanie_sn",
      "label": "Powstanie Stronnictwa Narodowego",
      "type": "event",
      "dates": "1928",
      "description": "Reorganizacja ruchu narodowego po zamachu majowym.",
      "importance": 0.75
    },
    {
      "id": "powstanie_owp",
      "label": "Powstanie Obozu Wielkiej Polski",
      "type": "event",
      "dates": "1926-12",
      "description": "Roman Dmowski powołał do życia Obóz Wielkiej Polski.",
      "importance": 0.75
    },
    {
      "id": "przeglad_wszechpolski",
      "label": "Przegląd Wszechpolski",
      "type": "publication",
      "dates": "1895-1905",
      "description": "Główna gazeta ND redagowana przez Popławskiego.",
      "importance": 0.8
    },
    {
      "id": "mysli_polaka",
      "label": "Myśli nowoczesnego Polaka",
      "type": "publication",
      "dates": "1903",
      "description": "Dzieło fundamentalne Dmowskiego.",
      "importance": 1.0
    },
    {
      "id": "egoizm_narodowy",
      "label": "Egoizm narodowy wobec etyki",
      "type": "publication",
      "dates": "1902",
      "description": "Kluczowa broszura Balickiego.",
      "importance": 0.9
    },
    {
      "id": "niemcy_rosja",
      "label": "Niemcy, Rosja i kwestia polska",
      "type": "publication",
      "dates": "1908",
      "description": "Dzieło Dmowskiego uzasadniające orientację prorosyjską.",
      "importance": 0.85
    },
    {
      "id": "kosciol_narod",
      "label": "Kościół, Naród i Państwo",
      "type": "publication",
      "dates": "1927",
      "description": "Broszura programowa Dmowskiego dla OWP.",
      "importance": 0.8
    },
    {
      "id": "polak",
      "label": "Polak",
      "type": "publication",
      "dates": "1900-1908",
      "description": "Miesięcznik dla chłopów redagowany przez Popławskiego.",
      "importance": 0.7
    },
    {
      "id": "akademik_polityka",
      "label": "Akademik i polityka",
      "type": "publication",
      "dates": "1929",
      "description": "Broszura Jana Mosdorfa o roli młodzieży akademickiej.",
      "importance": 0.65
    },
    {
      "id": "sila_prawo",
      "label": "Siła i prawo",
      "type": "publication",
      "dates": "1936",
      "description": "Dzieło Romana Rybarskiego.",
      "importance": 0.7
    },
    {
      "id": "nasz_patriotyzm",
      "label": "Nasz patriotyzm",
      "type": "publication",
      "dates": "1893",
      "description": "Broszura programowa nowo założonej Ligi Narodowej.",
      "importance": 0.85
    },
    {
      "id": "psychologia_spoleczna",
      "label": "Psychologia społeczna",
      "type": "publication",
      "description": "Dzieło Balickiego o psychologii mas.",
      "importance": 0.7
    },
    {
      "id": "wychowanie_narodowe",
      "label": "Zasady wychowania narodowego",
      "type": "publication",
      "description": "Program edukacji narodowej Balickiego.",
      "importance": 0.7
    },
    {
      "id": "polityka_narodowa_panstwie",
      "label": "Polityka narodowa w odbudowanym państwie",
      "type": "publication",
      "dates": "1920s",
      "description": "Wizja polityki narodowej w odrodzonej Polsce.",
      "importance": 0.75
    },
    {
      "id": "swiat_powojenny",
      "label": "Świat powojenny i Polska",
      "type": "publication",
      "description": "Analiza sytuacji międzynarodowej po I wojnie światowej.",
      "importance": 0.65
    },
    {
      "id": "gospodarka_narodowa",
      "label": "Gospodarka narodowa",
      "type": "publication",
      "description": "Koncepcja gospodarki narodowej Doboszyńskiego.",
      "importance": 0.6
    },
    {
      "id": "powstanie_zetu",
      "label": "Powstanie Związku Młodzieży 'Zet'",
      "type": "event",
      "dates": "1887",
      "description": "Balicki założył Związek Młodzieży Polskiej 'Zet'.",
      "importance": 0.7
    },
    {
      "id": "powstanie_glosu",
      "label": "Powstanie tygodnika Głos",
      "type": "event",
      "dates": "1886",
      "description": "Popławski współtworzył tygodnik Głos.",
      "importance": 0.65
    },
    {
      "id": "rozwiazanie_owp",
      "label": "Rozwiązanie OWP",
      "type": "event",
      "dates": "1933",
      "description": "Władze sanacyjne rozwiązały Obóz Wielkiej Polski.",
      "importance": 0.7
    },
    {
      "id": "wybory_1922",
      "label": "Wybory parlamentarne 1922",
      "type": "event",
      "dates": "1922",
      "description": "Pierwsze wybory do Sejmu RP.",
      "importance": 0.6
    },
    {
      "id": "wojna_polsko_sowiecka",
      "label": "Wojna polsko-sowiecka",
      "type": "event",
      "dates": "1919-1921",
      "description": "Konflikt zbrojny między Polską a Rosją sowiecką.",
      "importance": 0.85
    },
    
    // --- CONCEPTS ---
    {
      "id": "egoizm_narodowy_concept",
      "label": "Egoizm Narodowy",
      "type": "concept",
      "description": "Podstawowa filozofia ND autorstwa Balickiego. Narody powinny dążyć do racjonalnego interesu własnego.",
      "importance": 0.9
    },
    {
      "id": "koncepcja_piastowska",
      "label": "Koncepcja Piastowska",
      "type": "concept",
      "description": "Wizja Dmowskiego: Polska powinna być budowana na historycznie polskich ziemiach.",
      "importance": 0.85
    },
    {
      "id": "swiadomosc_narodowa",
      "label": "Świadomość Narodowa",
      "type": "concept",
      "description": "Kluczowe pojęcie Popławskiego. Naród to wspólnota kultury i historii.",
      "importance": 0.8
    },
    {
      "id": "polityka_wschodnia",
      "label": "Polityka Wschodnia",
      "type": "concept",
      "description": "Orientacja ND wobec Rosji i Niemiec. Niemcy jako główne zagrożenie.",
      "importance": 0.75
    },
    {
      "id": "nacjonalizm_katolicki",
      "label": "Nacjonalizm Katolicki",
      "type": "concept",
      "description": "Nierozerwalna więź katolicyzmu z polską tożsamością narodową.",
      "importance": 0.8
    },
    {
      "id": "demokracja_narodowa",
      "label": "Demokracja Narodowa",
      "type": "concept",
      "description": "Idea szerokiego ruchu narodowego obejmującego wszystkie warstwy społeczne.",
      "importance": 0.8
    },
    {
      "id": "solidaryzm_narodowy",
      "label": "Solidaryzm Narodowy",
      "type": "concept",
      "description": "Koncepcja ponadklasowej solidarności narodowej.",
      "importance": 0.75
    },
    {
      "id": "polityka_realna",
      "label": "Polityka Realna",
      "type": "concept",
      "description": "Pragmatyczne podejście do polityki w przeciwieństwie do romantycznego mesjanizmu.",
      "importance": 0.75
    },
    {
      "id": "ekspansja_kulturalna",
      "label": "Ekspansja Kulturalna",
      "type": "concept",
      "description": "Rozszerzanie polskości przez kulturę, język i edukację.",
      "importance": 0.65
    },
    {
      "id": "kwestia_zydowska",
      "label": "Kwestia Żydowska",
      "type": "concept",
      "description": "Postulat izolacji gospodarczej i kulturalnej Żydów.",
      "importance": 0.7
    },

    // --- REGIONAL EXPANSION (ADDED) ---
    {
      "id": "zln",
      "label": "Związek Ludowo-Narodowy",
      "type": "organization",
      "dates": "1919-1928",
      "description": "Partia polityczna Endecji w sejmie ustawodawczym. Bastion w Poznańskiem.",
      "region": "Wielkopolska",
      "importance": 0.85
    },
    {
      "id": "kurier_poznanski",
      "label": "Kurier Poznański",
      "type": "publication",
      "dates": "1872-1939",
      "description": "Główny organ prasowy Endecji w Wielkopolsce.",
      "region": "Wielkopolska",
      "importance": 0.75
    },
    {
      "id": "powstanie_wielkopolskie",
      "label": "Powstanie Wielkopolskie",
      "type": "event",
      "dates": "1918-1919",
      "description": "Zwycięskie powstanie, w którym dominującą rolę polityczną odegrała Endecja.",
      "region": "Wielkopolska",
      "importance": 0.9
    },
    {
      "id": "nrl",
      "label": "Naczelna Rada Ludowa",
      "type": "organization",
      "dates": "1918-1919",
      "description": "Organ władzy w Wielkopolsce podczas powstania.",
      "region": "Wielkopolska",
      "importance": 0.7
    },
    {
      "id": "slowo_polskie",
      "label": "Słowo Polskie",
      "type": "publication",
      "dates": "1895-1939",
      "description": "Główny dziennik narodowy we Lwowie.",
      "region": "Lwów",
      "importance": 0.7
    },
    {
      "id": "obrona_lwowa",
      "label": "Obrona Lwowa",
      "type": "event",
      "dates": "1918",
      "description": "Walki o polski Lwów. Endecja odegrała kluczową rolę w mobilizacji.",
      "region": "Lwów",
      "importance": 0.8
    },
    {
      "id": "szkola_lwowska",
      "label": "Lwowska Szkoła Historyczna",
      "type": "concept",
      "description": "Nurt historyczny (m.in. Bujak, Balzer) akcentujący rolę polskości na Kresach.",
      "region": "Lwów",
      "importance": 0.6
    },
    {
      "id": "gazeta_warszawska",
      "label": "Gazeta Warszawska",
      "type": "publication",
      "dates": "1774-1935",
      "description": "Główna trybuna Dmowskiego i obozu narodowego w Kongresówce.",
      "region": "Warszawa",
      "importance": 0.8
    },
    {
      "id": "piasecki_boleslaw",
      "label": "Bolesław Piasecki",
      "type": "person",
      "dates": "1915-1979",
      "description": "Przywódca radykalnego ONR-Falanga.",
      "region": "Warszawa",
      "importance": 0.7
    },
    {
      "id": "onr_falanga",
      "label": "ONR-Falanga",
      "type": "organization",
      "dates": "1935-1939",
      "description": "Ruch Narodowo-Radykalny. Frakcja Piaseckiego.",
      "region": "Warszawa",
      "importance": 0.65
    },
    {
      "id": "onr_abc",
      "label": "ONR-ABC",
      "type": "organization",
      "dates": "1935-1939",
      "description": "Obóz Narodowo-Radykalny ABC. Frakcja skupiona wokół dziennika 'ABC'.",
      "region": "Warszawa",
      "importance": 0.65
    },
    {
      "id": "rozlam_onr",
      "label": "Rozłam w ONR",
      "type": "event",
      "dates": "1935",
      "description": "Podział Obozu Narodowo-Radykalnego na frakcję ABC i Falangę.",
      "region": "Warszawa",
      "importance": 0.6
    }
  ],
  "edges": [
    // --- FROM SEED DATA ---
    { "source": "dmowski_roman", "target": "liga_narodowa", "label": "założył", "dates": "1893" },
    { "source": "poplawski_jan", "target": "liga_narodowa", "label": "współzałożył", "dates": "1893" },
    { "source": "balicki_zygmunt", "target": "liga_narodowa", "label": "współzałożył", "dates": "1893" },
    { "source": "dmowski_roman", "target": "egoizm_narodowy_concept", "label": "propagował" },
    { "source": "balicki_zygmunt", "target": "egoizm_narodowy_concept", "label": "sformułował teorię", "dates": "1902" },
    { "source": "dmowski_roman", "target": "koncepcja_piastowska", "label": "opracował", "dates": "1903" },
    { "source": "poplawski_jan", "target": "swiadomosc_narodowa", "label": "teoretyzował", "dates": "1904" },
    { "source": "liga_narodowa", "target": "snd", "label": "przekształciła się", "dates": "1897" },
    { "source": "snd", "target": "stronnictwo_narodowe", "label": "zreformowała się", "dates": "1928" },
    { "source": "dmowski_roman", "target": "snd", "label": "kierował", "dates": "1897-1919" },
    { "source": "dmowski_roman", "target": "komitet_narodowy", "label": "kierował", "dates": "1917-1919" },
    { "source": "dmowski_roman", "target": "owp", "label": "założył", "dates": "1926" },
    { "source": "dmowski_roman", "target": "stronnictwo_narodowe", "label": "wpływał", "dates": "1928-1939" },
    { "source": "poplawski_jan", "target": "przeglad_wszechpolski", "label": "redagował", "dates": "1895-1905" },
    { "source": "dmowski_roman", "target": "przeglad_wszechpolski", "label": "współpracował", "dates": "1895-1905" },
    { "source": "dmowski_roman", "target": "mysli_polaka", "label": "napisał", "dates": "1903" },
    { "source": "balicki_zygmunt", "target": "egoizm_narodowy", "label": "napisał", "dates": "1902" },
    { "source": "poplawski_jan", "target": "polak", "label": "redagował", "dates": "1900-1908" },
    { "source": "mosdorf_jan", "target": "akademik_polityka", "label": "napisał", "dates": "1929" },
    { "source": "rybarski_roman", "target": "sila_prawo", "label": "napisał", "dates": "1936" },
    { "source": "dmowski_roman", "target": "zalozenie_ligi", "label": "uczestniczył", "dates": "1893" },
    { "source": "dmowski_roman", "target": "udzial_w_dumie", "label": "reprezentował Polskę", "dates": "1906-1917" },
    { "source": "dmowski_roman", "target": "konferencja_paryska", "label": "reprezentował Polskę", "dates": "1919" },
    { "source": "dmowski_roman", "target": "smierc_dmowskiego", "label": "podmiot wydarzenia", "dates": "1939" },
    { "source": "dmowski_roman", "target": "rewolucja_1905", "label": "przeciwstawił się", "dates": "1905" },
    { "source": "dmowski_roman", "target": "powstanie_owp", "label": "zainicjował", "dates": "1926" },
    { "source": "dmowski_roman", "target": "pilsudski_jozef", "label": "rywalizował", "dates": "1900-1935", "sign": "negative" },
    { "source": "pilsudski_jozef", "target": "zamach_majowy", "label": "przeprowadził", "dates": "1926" },
    { "source": "stronnictwo_narodowe", "target": "zamach_majowy", "label": "sprzeciwiło się", "dates": "1926", "sign": "negative" },
    { "source": "mosdorf_jan", "target": "mlodziez_wszechpolska", "label": "kierował", "dates": "1920s" },
    { "source": "mlodziez_wszechpolska", "target": "owp", "label": "organ na uczelniach", "dates": "1926-1933" },
    { "source": "grabski_wladyslaw", "target": "stronnictwo_narodowe", "label": "członek", "dates": "1920s" },
    { "source": "rybarski_roman", "target": "stronnictwo_narodowe", "label": "poseł i przewodniczący klubu", "dates": "1928-1935" },
    { "source": "dmowski_roman", "target": "poplawski_jan", "label": "współpracował", "dates": "1893-1908" },
    { "source": "dmowski_roman", "target": "balicki_zygmunt", "label": "współpracował", "dates": "1893-1916" },
    { "source": "poplawski_jan", "target": "balicki_zygmunt", "label": "współpracował", "dates": "1893-1908" },
    { "source": "grabski_wladyslaw", "target": "grabski_stanislaw", "label": "bracia", "dates": "1874-1938" },
    { "source": "paderewski_ignacy", "target": "konferencja_paryska", "label": "współsygnatariusz", "dates": "1919" },
    { "source": "paderewski_ignacy", "target": "dmowski_roman", "label": "współpracował", "dates": "1919" },
    { "source": "romer_eugeniusz", "target": "konferencja_paryska", "label": "ekspert geograficzny", "dates": "1919" },
    { "source": "romer_eugeniusz", "target": "dmowski_roman", "label": "współpracował", "dates": "1919" },
    { "source": "seyda_mariano", "target": "stronnictwo_narodowe", "label": "członek", "dates": "1920s" },
    { "source": "seyda_mariano", "target": "dmowski_roman", "label": "współpracował", "dates": "1920s" },
    { "source": "stroński_stanisław", "target": "stronnictwo_narodowe", "label": "publicysta", "dates": "1920s-1930s" },
    { "source": "giertych_jędrzej", "target": "onr", "label": "przywódca", "dates": "1934" },
    { "source": "giertych_jędrzej", "target": "stronnictwo_narodowe", "label": "odłączył się", "dates": "1934", "sign": "negative" },
    { "source": "doboszynski_adam", "target": "stronnictwo_narodowe", "label": "członek", "dates": "1920s-1930s" },
    { "source": "doboszynski_adam", "target": "owp", "label": "członek", "dates": "1926-1933" },
    { "source": "doboszynski_adam", "target": "gospodarka_narodowa", "label": "napisał" },
    { "source": "demokracja_narodowa", "target": "liga_narodowa", "label": "idea założycielska", "dates": "1893" },
    { "source": "solidaryzm_narodowy", "target": "owp", "label": "zasada organizacyjna", "dates": "1926" },
    { "source": "wychowanie_narodowe", "target": "balicki_zygmunt", "label": "opracował" },
    { "source": "polityka_realna", "target": "dmowski_roman", "label": "propagował" },
    { "source": "ekspansja_kulturalna", "target": "poplawski_jan", "label": "teoretyzował" },
    { "source": "kwestia_zydowska", "target": "mlodziez_wszechpolska", "label": "walka", "dates": "1920s-1930s", "sign": "negative" },
    { "source": "dmowski_roman", "target": "nasz_patriotyzm", "label": "napisał", "dates": "1893" },
    { "source": "balicki_zygmunt", "target": "psychologia_spoleczna", "label": "napisał" },
    { "source": "dmowski_roman", "target": "polityka_narodowa_panstwie", "label": "napisał", "dates": "1920s" },
    { "source": "dmowski_roman", "target": "swiat_powojenny", "label": "napisał" },
    { "source": "balicki_zygmunt", "target": "powstanie_zetu", "label": "założył", "dates": "1887" },
    { "source": "poplawski_jan", "target": "powstanie_glosu", "label": "współtworzył", "dates": "1886" },
    { "source": "owp", "target": "rozwiazanie_owp", "label": "rozwiązano", "dates": "1933", "sign": "negative" },
    { "source": "stronnictwo_narodowe", "target": "wybory_1922", "label": "uczestniczyło", "dates": "1922" },
    { "source": "dmowski_roman", "target": "wojna_polsko_sowiecka", "label": "wspierał obronę", "dates": "1919-1921" },
    { "source": "mlodziez_wszechpolska", "target": "nka", "label": "kierowała", "dates": "1920s-1930s" },
    { "source": "nka", "target": "cie", "label": "reprezentowała Polskę", "dates": "1920s-1930s" },
    { "source": "liga_polska", "target": "liga_narodowa", "label": "przekształciła się", "dates": "1893" },
    { "source": "dmowski_roman", "target": "liga_polska", "label": "członek", "dates": "1887" },
    { "source": "balicki_zygmunt", "target": "przeglad_wszechpolski", "label": "współpracował", "dates": "1895-1905" },
    { "source": "wasilewski_leon", "target": "przeglad_wszechpolski", "label": "współpracował", "dates": "1895-1905" },
    { "source": "wasilewski_leon", "target": "liga_narodowa", "label": "członek", "dates": "1893-1920s" },
    { "source": "grabski_stanislaw", "target": "grabski_wladyslaw", "label": "bracia" },
    { "source": "grabski_stanislaw", "target": "stronnictwo_narodowe", "label": "członek", "dates": "1920s-1930s" },
    { "source": "mosdorf_jan", "target": "owp", "label": "działacz", "dates": "1926-1933" },
    { "source": "mosdorf_jan", "target": "stronnictwo_narodowe", "label": "członek", "dates": "1928-1939" },
    { "source": "rybarski_roman", "target": "owp", "label": "członek", "dates": "1926-1933" },
    { "source": "mysli_polaka", "target": "egoizm_narodowy_concept", "label": "propaguje", "dates": "1903" },
    { "source": "mysli_polaka", "target": "koncepcja_piastowska", "label": "przedstawia", "dates": "1903" },
    { "source": "egoizm_narodowy", "target": "egoizm_narodowy_concept", "label": "definiuje", "dates": "1902" },
    { "source": "nasz_patriotyzm", "target": "liga_narodowa", "label": "broszura programowa", "dates": "1893" },
    { "source": "powstanie_zetu", "target": "liga_narodowa", "label": "poprzedził", "dates": "1887" },
    { "source": "powstanie_glosu", "target": "przeglad_wszechpolski", "label": "poprzedził", "dates": "1886" },
    { "source": "snd", "target": "komitet_narodowy", "label": "delegowała do", "dates": "1917" },
    { "source": "owp", "target": "stronnictwo_narodowe", "label": "współpracował", "dates": "1928-1933" },
    { "source": "mlodziez_wszechpolska", "target": "wybory_1922", "label": "aktywna", "dates": "1922" },
    { "source": "komitet_narodowy", "target": "konferencja_paryska", "label": "uczestniczył", "dates": "1919" },
    { "source": "onr", "target": "stronnictwo_narodowe", "label": "odłączył się od", "dates": "1934", "sign": "negative" },
    { "source": "polityka_narodowa_panstwie", "target": "konferencja_paryska", "label": "opisuje", "dates": "1925" },
    { "source": "niemcy_rosja", "target": "udzial_w_dumie", "label": "uzasadnia", "dates": "1908" },
    { "source": "powstanie_zetu", "target": "mlodziez_wszechpolska", "label": "inspirował", "dates": "1887-1922" },
    { "source": "dmowski_roman", "target": "mosdorf_jan", "label": "wpływał", "dates": "1920s" },
    { "source": "dmowski_roman", "target": "giertych_jędrzej", "label": "inspirował", "dates": "1920s-1930s" },
    { "source": "balicki_zygmunt", "target": "rybarski_roman", "label": "inspirował" },
    { "source": "mysli_polaka", "target": "demokracja_narodowa", "label": "propaguje", "dates": "1903" },
    { "source": "mysli_polaka", "target": "polityka_realna", "label": "propaguje", "dates": "1903" },
    { "source": "egoizm_narodowy", "target": "solidaryzm_narodowy", "label": "łączy się" },
    { "source": "liga_narodowa", "target": "demokracja_narodowa", "label": "propagowała", "dates": "1893-1928" },
    { "source": "owp", "target": "solidaryzm_narodowy", "label": "propagował", "dates": "1926-1933" },
    { "source": "stronnictwo_narodowe", "target": "polityka_realna", "label": "praktykowało", "dates": "1928-1939" },
    { "source": "poplawski_jan", "target": "grabski_stanislaw", "label": "współpracował", "dates": "1890s-1908" },
    { "source": "balicki_zygmunt", "target": "wasilewski_leon", "label": "współpracował", "dates": "1890s-1916" },
    { "source": "poplawski_jan", "target": "zalozenie_ligi", "label": "uczestniczył", "dates": "1893" },
    { "source": "balicki_zygmunt", "target": "zalozenie_ligi", "label": "uczestniczył", "dates": "1893" },
    { "source": "koncepcja_piastowska", "target": "konferencja_paryska", "label": "realizowana", "dates": "1919" },
    { "source": "polityka_wschodnia", "target": "udzial_w_dumie", "label": "realizowana", "dates": "1906-1917" },
    { "source": "ekspansja_kulturalna", "target": "polak", "label": "narzędzie", "dates": "1900-1908" },
    
    // --- FROM REGIONAL RESEARCH EXPANSION ---
    { "source": "seyda_mariano", "target": "zln", "label": "kierował" },
    { "source": "seyda_mariano", "target": "kurier_poznanski", "label": "redagował" },
    { "source": "zln", "target": "stronnictwo_narodowe", "label": "przekształcił się w" },
    { "source": "dmowski_roman", "target": "zln", "label": "patronował" },
    { "source": "nrl", "target": "powstanie_wielkopolskie", "label": "kierowała" },
    { "source": "seyda_mariano", "target": "nrl", "label": "członek" },
    { "source": "glabisz_stanislaw", "target": "snd", "label": "prezesował" },
    { "source": "glabisz_stanislaw", "target": "slowo_polskie", "label": "współpracował" },
    { "source": "grabski_stanislaw", "target": "glabisz_stanislaw", "label": "współpracował" },
    { "source": "grabski_stanislaw", "target": "slowo_polskie", "label": "pisał do" },
    { "source": "snd", "target": "obrona_lwowa", "label": "organizowało" },
    { "source": "szkola_lwowska", "target": "koncepcja_piastowska", "label": "inspirowała" },
    { "source": "dmowski_roman", "target": "gazeta_warszawska", "label": "publikował" },
    { "source": "poplawski_jan", "target": "gazeta_warszawska", "label": "współpracował" },
    { "source": "piasecki_boleslaw", "target": "onr_falanga", "label": "utworzył" },
    { "source": "mosdorf_jan", "target": "onr_abc", "label": "współtworzył" },
    { "source": "onr_falanga", "target": "rozlam_onr", "label": "wynikł z" },
    { "source": "onr_abc", "target": "rozlam_onr", "label": "wynikł z" },
    { "source": "piasecki_boleslaw", "target": "mosdorf_jan", "label": "konflikt", "sign": "negative" },
    { "source": "zln", "target": "snd", "label": "kontynuacja" },
    { "source": "komitet_narodowy", "target": "seyda_mariano", "label": "członek" },
    { "source": "komitet_narodowy", "target": "glabisz_stanislaw", "label": "członek" }
  ]
};

// --- DATA MAPPING HELPERS ---

const getYear = (node: any): number | undefined => {
  if (node.year) return node.year;
  const dateStr = node.dates || node.date || node.start_date || node.founding_date || node.birth_date;
  if (dateStr === null || dateStr === undefined) return undefined;
  
  if (typeof dateStr === 'number') return dateStr;
  
  try {
    const str = String(dateStr); // safer than toString()
    const match = str.match(/\d{4}/);
    if (match && match.length > 0) {
      return parseInt(match[0]);
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

// Helper for TKG: Parse Start/End
const parseDates = (dateStr?: string): { start?: number, end?: number } => {
  if (!dateStr) return {};
  const years = dateStr.match(/\d{4}/g);
  if (!years) return {};
  
  if (years.length >= 2) {
    return { start: parseInt(years[0]), end: parseInt(years[1]) };
  } else if (years.length === 1) {
    return { start: parseInt(years[0]) };
  }
  return {};
};

const getCertainty = (node: any): 'confirmed' | 'disputed' | 'alleged' => node.certainty || 'confirmed';

const getSources = (n: any) => {
  if (!n.sources) return undefined;
  // Safely flatten sources to strings if they are objects
  if (Array.isArray(n.sources)) {
    return n.sources.map((s: any) => {
       if (typeof s === 'string') return s;
       if (typeof s === 'object' && s !== null) return s.title || JSON.stringify(s);
       return String(s);
    });
  }
  return undefined;
}

const mappedNodes: GraphNode[] = DATA.nodes.map(n => ({
  data: {
    id: n.id,
    label: n.label,
    type: n.type as any,
    year: getYear(n),
    dates: n.dates,
    description: n.description,
    importance: n.importance,
    region: (n as any).region || 'Unknown',
    certainty: getCertainty(n),
    sources: getSources(n)
  }
}));

// Create set of node IDs to filter invalid edges
const nodeIds = new Set(DATA.nodes.map(n => n.id));

const mappedEdges: GraphEdge[] = DATA.edges
  .filter((e: any) => e && nodeIds.has(e.source) && nodeIds.has(e.target)) // Ensure referential integrity and non-null edge
  .map((e: any, i: number) => {
    const { start, end } = parseDates((e as any).dates);
    return {
      data: {
        id: `edge_${i}_${e.source}_${e.target}`,
        source: e.source,
        target: e.target,
        label: e.label || (e as any).relationship || 'related',
        dates: (e as any).dates,
        validFrom: start,
        validTo: end,
        sign: ((e as any).sign || 'positive') as 'positive' | 'negative',
        certainty: 'confirmed' as const
      }
    };
  });

export const INITIAL_GRAPH: KnowledgeGraph = {
  nodes: mappedNodes,
  edges: mappedEdges,
  meta: {
     version: DATA.metadata.version
  }
};

export const COLORS = {
  person: '#3b82f6',
  Person: '#3b82f6',
  organization: '#ef4444',
  Organization: '#ef4444',
  event: '#eab308',
  Event: '#eab308',
  publication: '#10b981',
  Publication: '#10b981',
  concept: '#a855f7',
  Concept: '#a855f7',
};

// Tier-4 Palette: Gold -> Crimson -> Navy (Endecja Historical)
export const COMMUNITY_COLORS = [
  THEME.colors.archivalGold,
  THEME.colors.crimson,
  '#1e3a8a', // Navy (Blue-900)
  '#c2410c', // Orange-700
  '#0f766e', // Teal-700
  '#4338ca', // Indigo-700
  '#7f1d1d', // Red-900
  '#a16207', // Yellow-800
  '#312e81', // Indigo-900
];
