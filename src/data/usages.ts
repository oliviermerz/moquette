import type { Tex } from './textures';

export interface Faq { q: string; a: string }
export type SupportStatus = 'oui' | 'conditions' | 'non';

export interface Usage {
  slug: string;
  label: string; // libellé court (menus, cartes)
  kicker: string;
  h1: string;
  metaTitle: string;
  metaDescription: string;
  intro: string;
  serviceType: string;
  tex: Tex; // finition illustrée
  before: Tex; // support illustré
  benefits: { title: string; text: string }[];
  supports: { name: string; status: SupportStatus; note: string }[];
  attention: string[];
  faq: Faq[];
  related: string[];
}

export const usages: Usage[] = [
  {
    slug: 'terrasse-moquette-de-pierre',
    label: 'Terrasse',
    kicker: 'Terrasse',
    h1: 'Une terrasse en pierre naturelle, faite pour être vécue.',
    metaTitle: 'Terrasse en moquette de pierre',
    metaDescription:
      'Transformez votre terrasse béton ou carrelage avec une moquette de pierre posée par des spécialistes. Diagnostic du support, estimation en ligne.',
    intro:
      "La terrasse est la pièce la plus vécue de l'extérieur. Une moquette de pierre lui donne un aspect minéral, chaleureux et continu, souvent sans démolir le support existant.",
    serviceType: 'Pose de moquette de pierre sur terrasse',
    tex: 'beige',
    before: 'beton',
    benefits: [
      { title: 'Une surface continue', text: "Fini les joints de carrelage qui noircissent. Le sol forme un seul ensemble, de la baie vitrée jusqu'au jardin." },
      { title: 'Sans tout casser', text: "Sur un béton ou un carrelage sain, la pose se fait directement sur l'existant. Moins de gravats, un chantier plus court." },
      { title: 'Une matière agréable', text: 'Le grain de la pierre se marche pieds nus et accroche la lumière rasante en fin de journée.' },
    ],
    supports: [
      { name: 'Dalle béton saine', status: 'oui', note: 'Le cas le plus courant. Nettoyage et primaire adaptés.' },
      { name: 'Carrelage bien adhérent', status: 'conditions', note: 'Vérifié au sonnage : un carreau qui sonne creux doit être repris.' },
      { name: 'Dallage stable', status: 'conditions', note: 'Les dalles qui bougent sont refixées avant la pose.' },
      { name: 'Béton fissuré', status: 'conditions', note: 'Les fissures sont traitées. Une fissure encore active peut réapparaître.' },
      { name: 'Terre, gravier', status: 'non', note: 'Un support stable doit être créé avant toute pose.' },
    ],
    attention: [
      "La moquette de pierre ajoute une épaisseur, précisée au devis selon le système retenu. Nous vérifions les seuils de portes-fenêtres avant de nous engager.",
      "Les pentes existantes sont conservées : si l'eau stagne aujourd'hui, la cause est traitée au diagnostic, pas masquée.",
      'Les joints de dilatation du support sont repris dans le revêtement pour éviter les fissures.',
    ],
    faq: [
      { q: 'Peut-on poser une moquette de pierre sur un béton fissuré ?', a: "Oui, après traitement des fissures. Une fissure qui bouge encore peut toutefois réapparaître en surface : c'est précisément ce que le diagnostic évalue avant le devis." },
      { q: 'Peut-on installer un barbecue ou un brasero sur la terrasse ?', a: "Le mobilier de jardin ne pose aucun problème. Pour un barbecue ou un brasero, prévoyez une protection au sol : la chaleur directe et les graisses peuvent marquer la résine." },
      { q: 'Quand peut-on remarcher sur la terrasse ?', a: 'Le délai dépend du système de résine et de la météo au moment de la pose. Il vous est indiqué précisément à la réception du chantier.' },
    ],
    related: ['moquette-de-pierre-piscine', 'renovation-terrasse', 'moquette-de-pierre-escalier'],
  },
  {
    slug: 'moquette-de-pierre-piscine',
    label: 'Piscine',
    kicker: 'Plage de piscine',
    h1: 'Une plage de piscine minérale, agréable pieds nus.',
    metaTitle: 'Moquette de pierre autour de la piscine',
    metaDescription:
      'Plage de piscine en moquette de pierre : confort pieds nus, surface continue, pose sur carrelage ou béton existant après diagnostic. Estimez votre projet.',
    intro:
      "Autour d'un bassin, le sol compte autant que l'eau. Une moquette de pierre crée une plage continue, douce sous le pied, qui met en valeur la piscine au lieu de la cerner de joints.",
    serviceType: 'Pose de moquette de pierre en plage de piscine',
    tex: 'blanc',
    before: 'carrelage',
    benefits: [
      { title: 'Confort pieds nus', text: 'Des granulats roulés, aux arêtes douces, choisis pour être marchés sans chaussures.' },
      { title: "De l'accroche", text: "La texture granuleuse offre naturellement de l'accroche. La taille du grain se choisit aussi pour cela." },
      { title: 'Le bassin mis en valeur', text: 'Une teinte claire et continue souligne la couleur de l’eau et la forme de la piscine.' },
    ],
    supports: [
      { name: 'Ancien carrelage de plage', status: 'conditions', note: 'Le cas le plus fréquent. Sonnage carreau par carreau.' },
      { name: 'Dalle béton', status: 'oui', note: 'Nettoyage, préparation et primaire adaptés.' },
      { name: 'Margelles existantes', status: 'conditions', note: 'Conservées ou recouvertes selon leur état et le rendu souhaité.' },
      { name: 'Terre, gazon', status: 'non', note: 'Une dalle doit être créée avant la pose.' },
    ],
    attention: [
      'Nous vérifions la compatibilité du système retenu avec votre traitement d’eau (chlore, sel, brome) sur la fiche technique du fabricant.',
      'Les teintes claires chauffent moins au soleil que les teintes foncées : un critère à prendre en compte autour d’un bassin.',
      'Le bassin, le liner ou la coque sont protégés pendant toute la durée du chantier.',
    ],
    faq: [
      { q: 'Une moquette de pierre est-elle glissante autour d’une piscine ?', a: "La texture granuleuse offre de l'accroche, mouillée comme sèche. Nous choisissons avec vous la taille de grain la plus adaptée à l’usage pieds nus." },
      { q: 'Est-ce compatible avec une piscine au sel ?', a: 'Cela dépend du système de résine. Nous le vérifions sur la fiche technique du fabricant avant de vous le proposer.' },
      { q: 'Faut-il vider la piscine pendant les travaux ?', a: 'Non, dans la grande majorité des cas. Le bassin est protégé et les travaux se font sur la plage uniquement.' },
    ],
    related: ['terrasse-moquette-de-pierre', 'renovation-terrasse', 'moquette-de-pierre-escalier'],
  },
  {
    slug: 'moquette-de-pierre-allee',
    label: 'Allée',
    kicker: 'Allée',
    h1: 'Une allée qui accueille, de la rue jusqu’à la porte.',
    metaTitle: 'Allée en moquette de pierre',
    metaDescription:
      'Allée piétonne ou carrossable en moquette de pierre : bordures nettes, surface continue, pas d’herbe dans les joints. Estimation en ligne en 2 minutes.',
    intro:
      "L'allée est le premier contact avec la maison. En pierre naturelle résinée, elle devient une ligne nette et lumineuse qui guide le regard jusqu'à l'entrée.",
    serviceType: 'Pose de moquette de pierre sur allée',
    tex: 'gris',
    before: 'dalles',
    benefits: [
      { title: "Plus d'herbe entre les joints", text: 'Sur un support continu, rien ne pousse à travers la surface.' },
      { title: 'Des lignes nettes', text: "Bordures, courbes, changements de teinte : l'allée se dessine comme un trait d'architecture." },
      { title: 'Pensée pour l’eau de pluie', text: "L'écoulement est étudié pour éloigner l'eau de la maison." },
    ],
    supports: [
      { name: 'Béton existant', status: 'oui', note: 'Après nettoyage et traitement des fissures.' },
      { name: 'Ancien dallage ou pavés', status: 'conditions', note: 'Uniquement si les éléments sont stables et bien jointoyés.' },
      { name: 'Enrobé (bitume)', status: 'conditions', note: 'Selon son état et le système retenu : à vérifier au diagnostic.' },
      { name: 'Gravier', status: 'non', note: 'Le gravier ne peut pas servir de support : une base stable est créée d’abord.' },
    ],
    attention: [
      'Une allée où circulent des voitures demande un système et un support prévus pour cet usage. Dites-nous si des véhicules lourds y passent (camping-car, livraisons).',
      'Les bordures contiennent le revêtement et évitent que la pelouse ne l’envahisse.',
      'Le sens d’écoulement de l’eau de pluie est vérifié pour ne jamais la renvoyer vers la façade.',
    ],
    faq: [
      { q: 'Peut-on rouler en voiture sur une allée en moquette de pierre ?', a: "Oui, avec un système et un support dimensionnés pour les véhicules légers, ce qui se vérifie au diagnostic. Une allée prévue pour les piétons n'est pas faite pour ça." },
      { q: 'Les mauvaises herbes peuvent-elles pousser ?', a: 'Pas à travers une moquette de pierre posée sur un support continu. Sur les bords, des bordures nettes évitent l’envahissement par la pelouse.' },
      { q: 'Mon allée est en gravier, est-ce possible ?', a: 'Oui, mais le gravier ne peut pas servir de support. Une base stable est d’abord créée, ce qui fait partie du devis.' },
    ],
    related: ['moquette-de-pierre-entree', 'terrasse-moquette-de-pierre', 'moquette-de-pierre-escalier'],
  },
  {
    slug: 'moquette-de-pierre-entree',
    label: 'Entrée',
    kicker: 'Entrée de maison',
    h1: 'Une entrée qui donne le ton de toute la maison.',
    metaTitle: 'Entrée de maison en moquette de pierre',
    metaDescription:
      'Rénovez l’entrée de votre maison avec une moquette de pierre : perron, seuil, marches. Finitions sur mesure, diagnostic avant devis.',
    intro:
      "Perron, seuil, quelques mètres carrés devant la porte : c'est petit, mais c'est ce que tout le monde voit. Une entrée en pierre naturelle change la perception de la façade entière.",
    serviceType: "Pose de moquette de pierre sur entrée de maison",
    tex: 'mix',
    before: 'carrelage',
    benefits: [
      { title: 'Un effet immédiat', text: 'Une petite surface, une transformation visible depuis la rue.' },
      { title: 'Accordée à la façade', text: 'La teinte se choisit avec les menuiseries, l’enduit et la couleur de la porte.' },
      { title: 'Des finitions soignées', text: 'Nez de marche, seuil, encastrement du tapis-brosse : tout est pensé au millimètre.' },
    ],
    supports: [
      { name: 'Perron carrelé', status: 'conditions', note: 'Si le carrelage est sain. Les nez de marche sont repris.' },
      { name: 'Béton brut', status: 'oui', note: 'Après préparation et primaire.' },
      { name: 'Pierre naturelle ancienne', status: 'conditions', note: 'Selon la porosité et l’état : à vérifier sur place.' },
    ],
    attention: [
      "L'épaisseur ajoutée est vérifiée au niveau du seuil de porte pour que la porte continue de s'ouvrir librement.",
      'Le tapis-brosse peut être encastré dans le revêtement pour un rendu net.',
      'Les marches du perron sont traitées avec des nez de marche adaptés.',
    ],
    faq: [
      { q: 'Peut-on recouvrir les marches du perron ?', a: 'Oui. Les marches sont traitées avec des nez de marche adaptés, et les hauteurs sont vérifiées pour rester confortables.' },
      { q: 'Comment choisir la couleur ?', a: 'Avec la façade, les menuiseries et la toiture. Nous apportons des échantillons sur place pour juger à la lumière réelle.' },
      { q: "Comment entretenir l'entrée ?", a: 'Un balayage régulier ou un souffleur pour les feuilles, et un nettoyage à l’eau de temps en temps, selon les recommandations du fabricant.' },
    ],
    related: ['moquette-de-pierre-allee', 'moquette-de-pierre-escalier', 'terrasse-moquette-de-pierre'],
  },
  {
    slug: 'moquette-de-pierre-escalier',
    label: 'Escalier',
    kicker: 'Escalier extérieur',
    h1: 'Des marches minérales, nettes et sûres.',
    metaTitle: 'Escalier extérieur en moquette de pierre',
    metaDescription:
      'Rénovez votre escalier extérieur en moquette de pierre : nez de marche, hauteurs maîtrisées, finition continue avec la terrasse. Devis sur diagnostic.',
    intro:
      "Un escalier extérieur relie deux niveaux de vie. En moquette de pierre, il prolonge la terrasse ou l'allée sans rupture de matière, avec des marches nettes et une bonne prise sous le pied.",
    serviceType: 'Pose de moquette de pierre sur escalier extérieur',
    tex: 'mix',
    before: 'beton',
    benefits: [
      { title: 'Continuité de matière', text: "L'escalier prend la même finition que la terrasse ou l'allée qu'il dessert." },
      { title: 'Des nez de marche lisibles', text: 'Chaque marche est clairement dessinée, de jour comme en fin de journée.' },
      { title: 'De l’accroche', text: 'Le grain de la pierre offre une surface texturée sous le pied.' },
    ],
    supports: [
      { name: 'Marches béton', status: 'oui', note: 'Le cas idéal, après réparation des arêtes abîmées.' },
      { name: 'Marches carrelées', status: 'conditions', note: 'Si les carreaux et les nez de marche sont bien adhérents.' },
      { name: 'Marches en bois', status: 'non', note: 'Support non adapté à une moquette de pierre.' },
    ],
    attention: [
      "L'épaisseur ajoutée sur chaque marche décale la première et la dernière hauteur. Nous en tenons compte pour garder un escalier confortable et régulier.",
      'Un escalier se chiffre à la marche plutôt qu’au mètre carré : les finitions représentent l’essentiel du travail.',
      'Les contremarches peuvent être recouvertes ou laissées apparentes, selon le rendu souhaité.',
    ],
    faq: [
      { q: 'Comment est calculé le prix d’un escalier ?', a: "À la marche plutôt qu'au mètre carré, car les nez de marche et les finitions prennent l'essentiel du temps de pose." },
      { q: "Est-ce glissant l'hiver ?", a: "La texture offre de l'accroche, mais aucune surface extérieure n'est insensible au gel ou aux feuilles mouillées. Un entretien régulier reste nécessaire." },
      { q: 'Peut-on faire un escalier seul, sans la terrasse ?', a: 'Oui. Mais traiter l’escalier avec la surface qu’il dessert donne un résultat plus cohérent et optimise le chantier.' },
    ],
    related: ['terrasse-moquette-de-pierre', 'moquette-de-pierre-entree', 'moquette-de-pierre-allee'],
  },
  {
    slug: 'renovation-terrasse',
    label: 'Rénovation de terrasse',
    kicker: 'Rénovation',
    h1: 'Rénover sa terrasse sans forcément tout démolir.',
    metaTitle: 'Rénovation de terrasse sans démolition',
    metaDescription:
      'Carrelage décollé, béton taché, dallage moussu : rénovez votre terrasse avec une moquette de pierre posée sur l’existant quand le support le permet.',
    intro:
      "Carrelage qui se décolle, béton taché et fissuré, dalles envahies de mousse : une terrasse fatiguée n'est pas toujours à casser. Quand le support est sain, on peut la transformer en la recouvrant.",
    serviceType: 'Rénovation de terrasse par moquette de pierre',
    tex: 'beige',
    before: 'carrelage',
    benefits: [
      { title: 'Moins de gravats', text: 'Pas de démolition ni d’évacuation quand le support est conservé.' },
      { title: 'Un chantier plus court', text: 'La préparation remplace la démolition : vous retrouvez votre terrasse plus vite.' },
      { title: 'Un diagnostic honnête', text: 'Si votre support ne permet pas la pose, nous vous le disons avant le devis.' },
    ],
    supports: [
      { name: 'Carrelage terne mais sain', status: 'oui', note: 'Le cas typique de rénovation par recouvrement.' },
      { name: 'Carrelage partiellement décollé', status: 'conditions', note: 'Les zones creuses sont déposées et reprises avant la pose.' },
      { name: 'Béton taché ou fissuré', status: 'conditions', note: 'Nettoyage, traitement des fissures, primaire.' },
      { name: 'Support qui bouge ou affaissé', status: 'non', note: 'Une reprise du support, voire une démolition, est nécessaire.' },
    ],
    attention: [
      'Trois issues possibles au diagnostic : recouvrir directement, réparer puis recouvrir, ou reprendre le support. Nous vous expliquons pourquoi.',
      "Si les pentes renvoient l'eau vers la maison, elles doivent être corrigées avant la pose.",
      "Le gain de la rénovation sans démolition dépend entièrement de l'état du support : c'est pour ça que le diagnostic passe avant le devis.",
    ],
    faq: [
      { q: 'Quand faut-il démolir malgré tout ?', a: "Quand le support bouge, sonne creux sur une grande surface, ou que les pentes renvoient l'eau vers la maison. Dans ce cas, nous vous le disons avant le devis." },
      { q: 'Peut-on poser sur un carrelage gélif ?', a: "Seulement si les carreaux sont encore parfaitement adhérents. Un carrelage qui éclate ou se décolle au gel doit être déposé dans les zones concernées." },
      { q: 'Combien de temps dure une rénovation ?', a: "Cela dépend de la surface et de la préparation nécessaire. La durée est indiquée dans le devis, après la visite technique." },
    ],
    related: ['terrasse-moquette-de-pierre', 'moquette-de-pierre-piscine', 'moquette-de-pierre-allee'],
  },
];

export const usageBySlug = (slug: string) => usages.find((u) => u.slug === slug);
