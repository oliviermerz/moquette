import type { Faq } from './usages';

export const method = [
  {
    n: '01', name: 'Imaginer',
    short: 'Nous comprenons votre projet et vos envies.',
    detail: "Un premier échange, par téléphone ou à partir de votre estimation en ligne : l'espace, l'usage, le style, vos contraintes de calendrier.",
    deliverable: 'Une première idée du budget et des solutions possibles.',
  },
  {
    n: '02', name: 'Diagnostiquer',
    short: 'Nous analysons votre support sur place.',
    detail: "Visite technique : nature du support, adhérence, planéité, fissures, pentes et évacuation de l'eau, seuils, accès au chantier. C'est elle qui détermine la préparation.",
    deliverable: 'Un avis technique clair : recouvrir, réparer puis recouvrir, ou reprendre le support.',
  },
  {
    n: '03', name: 'Visualiser',
    short: 'Vous choisissez votre finition et voyez le résultat.',
    detail: 'Échantillons de granulats sur place, à la lumière de votre extérieur. Choix de la teinte, des bordures et des finitions.',
    deliverable: 'Un devis détaillé poste par poste, avec la finition choisie.',
  },
  {
    n: '04', name: 'Transformer',
    short: 'Nos équipes préparent et posent.',
    detail: 'Protection des abords, préparation du support, primaire, mélange et pose des granulats, finitions. Le chantier est photographié à chaque étape.',
    deliverable: 'Un suivi de chantier et un interlocuteur unique.',
  },
  {
    n: '05', name: 'Profiter',
    short: 'Réception, conseils d’entretien, suivi.',
    detail: "Réception du chantier avec vous, consignes de mise en service et d'entretien, documents de garantie.",
    deliverable: 'Les photos avant/après de votre projet et un guide d’entretien.',
  },
];

export const whyUs = [
  { n: '01', title: 'Spécialistes de la pierre résinée', text: 'Un seul savoir-faire, maîtrisé de la préparation du support à la dernière finition.' },
  { n: '02', title: 'Diagnostic technique avant chantier', text: "Nous analysons votre support avant de chiffrer : adhérence, planéité, fissures, évacuation de l'eau." },
  { n: '03', title: 'Estimation transparente', text: "Une première estimation en ligne, puis un devis détaillé poste par poste. Vous savez ce que vous payez." },
  { n: '04', title: 'Visualisation de votre projet', text: 'Échantillons sur place et visualisation de la finition choisie, avant de vous engager.' },
  { n: '05', title: 'Poseurs professionnels', text: 'Des équipes formées à la pose de pierre naturelle résinée, qui ne font que ça.' },
  { n: '06', title: 'Suivi et garanties', text: 'Un interlocuteur unique, un chantier documenté en photos, des garanties expliquées noir sur blanc.' },
];

export const pillars = [
  { name: 'Beau', text: 'Un aspect minéral naturel, de nombreuses combinaisons de granulats et de couleurs, un rendu architectural.' },
  { name: 'Durable', text: "Une solution conçue pour l'extérieur et les usages quotidiens, avec un entretien simple." },
  { name: 'Drainant', note: 1, text: "La structure laisse passer l'eau. Le résultat dépend du support et du système posé : nous l'étudions au diagnostic." },
  { name: 'Rapide', note: 2, text: "Souvent posé sur l'existant, sans démolition, lorsque le support est compatible." },
  { name: 'Rassurant', text: 'Diagnostic, préparation, pose par nos équipes, suivi de chantier et garanties expliquées.' },
];

export const homeFaq: Faq[] = [
  { q: 'Peut-on poser une moquette de pierre sur du carrelage ?', a: 'Souvent, si le carrelage est sain et bien adhérent. Nous le vérifions au diagnostic : sonnage des carreaux, état des joints, pentes.' },
  { q: 'Une moquette de pierre est-elle vraiment drainante ?', a: "Sa structure laisse passer l'eau. Sur un support étanche comme une dalle béton, l'eau doit ensuite s'évacuer par la pente : nous l'étudions au cas par cas." },
  { q: 'Combien coûte une moquette de pierre ?', a: "Le prix dépend de la surface, du support, de sa préparation, de la géométrie, des bordures, des escaliers, du granulat et de l'accès au chantier. L'estimation en ligne vous donne une première idée." },
  { q: 'Comment entretenir une moquette de pierre ?', a: "Un balayage régulier et un nettoyage à l'eau suffisent la plupart du temps. Le nettoyeur haute pression s'utilise à distance et à pression modérée, selon les recommandations du fabricant." },
  { q: 'Combien de temps dure le chantier ?', a: "Cela dépend de la surface et de la préparation du support. La durée est indiquée dans le devis, après la visite technique." },
  { q: 'Dans quelles villes intervenez-vous ?', a: 'Nous intervenons dans les Hauts-de-France, notamment autour de Lille, Valenciennes, Douai, Lens, Arras, Cambrai, Béthune, Dunkerque, Calais et Amiens.' },
];
