import type { Locale } from "@/lib/i18n/config";

interface LocalisedService {
  title: string;
  summary: string;
  intro: string;
  steps: string[];
  certifications?: string[];
  note?: string;
}

export interface ReconditioningService extends LocalisedService {
  slug: string;
}

interface ServiceDefinition {
  slug: string;
  fr: LocalisedService;
  en: LocalisedService;
}

const SERVICES: ServiceDefinition[] = [
  {
    slug: "culasses",
    fr: {
      title: "Culasses",
      summary:
        "Réparation par soudure fonte, usinage de précision et tests de pression pour culasses fissurées ou endommagées.",
      intro:
        "Les culasses fissurées ou endommagées font l'objet d'une évaluation préalable afin de déterminer si une réparation est économiquement pertinente. Les culasses en fonte de presque tous les types de moteurs sont prises en charge.",
      steps: [
        "Évaluation de l'état général et de la faisabilité économique de la réparation.",
        "Contrôle de la compatibilité des matériaux entre la culasse et le métal d'apport.",
        "Préchauffage et refroidissement maîtrisés, adaptés à la réaction des différents matériaux.",
        "Réparation par soudure à la baguette de fonte, à température stabilisée.",
        "Usinage de précision aux tolérances d'origine du constructeur.",
        "Test de pression et contrôle de détection de fissures sur toutes les pièces.",
        "Rénovation ou remplacement des sièges, inserts, boulons et plaques de fixation.",
      ],
      certifications: ["Suivi Lloyd's Register sur demande"],
      note: "Chaque intervention fait l'objet d'un rapport détaillé, avec certificat d'analyse métallurgique et procès-verbal de test de pression sur demande.",
    },
    en: {
      title: "Cylinder heads",
      summary:
        "Cast iron welding repair, precision machining and pressure testing for cracked or damaged cylinder heads.",
      intro:
        "Cracked or damaged cylinder heads are first assessed to determine whether a repair is economically worthwhile. Cast iron cylinder heads from almost every engine type can be handled.",
      steps: [
        "Assessment of overall condition and of the economic viability of the repair.",
        "Verification of material compatibility between the head and the filler metal.",
        "Controlled preheating and cooling, matched to how each material reacts.",
        "Repair by cast iron stick welding at a stabilised temperature.",
        "Precision machining to the manufacturer's original tolerances.",
        "Pressure testing and crack detection on every part.",
        "Refurbishment or replacement of seats, inserts, bolts and mounting plates.",
      ],
      certifications: ["Lloyd's Register survey on request"],
      note: "Each job comes with a detailed report, along with a metallurgical analysis certificate and pressure test record on request.",
    },
  },
  {
    slug: "corps-de-soupape",
    fr: {
      title: "Corps de soupape d'échappement",
      summary:
        "Découpe et rechargement du siège au Stellite, métallisation des zones d'usure et contrôle aux spécifications d'origine.",
      intro:
        "La rénovation des corps de soupape d'échappement restaure l'étanchéité du siège et le bon fonctionnement du circuit d'eau de refroidissement, souvent obstrué au niveau de la couronne et des lumières d'admission.",
      steps: [
        "Découpe et dépose du siège de soupape, mise en évidence des obstructions du circuit d'eau.",
        "Nettoyage complet des passages obstrués.",
        "Soudure d'un siège neuf avec apport de Stellite sur le corps.",
        "Analyse de compatibilité entre le matériau du siège neuf et celui du corps d'origine.",
        "Détermination des paramètres de soudure et des traitements thermiques avant et après opération.",
        "Métallisation des zones d'usure sensibles pour prévenir l'érosion du métal.",
        "Contrôles rigoureux de conformité aux spécifications d'origine.",
      ],
      certifications: ["Procédures approuvées Lloyd's Register"],
      note: "L'ensemble des travaux est consigné dans un rapport détaillé remis au client.",
    },
    en: {
      title: "Exhaust valve bodies",
      summary:
        "Seat cutting and Stellite rebuild, metal spraying of wear zones and inspection against original specifications.",
      intro:
        "Reconditioning exhaust valve bodies restores seat tightness and proper operation of the cooling water circuit, which is often obstructed around the crown and inlet openings.",
      steps: [
        "Cutting and removal of the valve seat, revealing obstructions in the water circuit.",
        "Thorough cleaning of the obstructed passages.",
        "Welding of a new seat with Stellite applied to the body.",
        "Compatibility analysis between the new seat material and the original body.",
        "Determination of welding parameters and of heat treatments before and after the operation.",
        "Metal spraying of sensitive wear zones to prevent metal erosion.",
        "Rigorous checks against the original specifications.",
      ],
      certifications: ["Procedures approved by Lloyd's Register"],
      note: "All work is documented in a detailed report handed over to the customer.",
    },
  },
  {
    slug: "tetes-de-pistons",
    fr: {
      title: "Têtes de pistons",
      summary:
        "Restauration des gorges par chromage électrolytique et reprise de la hauteur intérieure aux cotes d'origine.",
      intro:
        "Les têtes de pistons sont expertisées à réception afin d'identifier les problèmes d'état général, fissures, matage et érosion. Les gorges font l'objet d'un contrôle et d'un relevé dimensionnel soigné.",
      steps: [
        "Expertise de l'état général : fissures, matage, érosion.",
        "Contrôle et mesure dimensionnelle des gorges.",
        "Restauration des gorges aux cotes d'origine par chromage électrolytique.",
        "Contrôle et reprise de la hauteur intérieure pour garantir le jeu entre tête et jupe de piston.",
        "Usinage final et contrôle dimensionnel.",
      ],
      certifications: ["Procédure approuvée Germanischer Lloyd"],
      note: "Un rapport complet est remis au client à l'issue de l'intervention.",
    },
    en: {
      title: "Piston crowns",
      summary:
        "Groove restoration by electroplated chromium and re-machining of the internal height to original dimensions.",
      intro:
        "Piston crowns are inspected on arrival to identify problems with overall condition, cracks, fretting and erosion. The grooves are carefully checked and measured.",
      steps: [
        "Inspection of overall condition: cracks, fretting, erosion.",
        "Dimensional inspection and measurement of the grooves.",
        "Restoration of the grooves to original dimensions by electroplated chromium.",
        "Checking and re-machining of the internal height to maintain crown-to-skirt clearance.",
        "Final machining and dimensional inspection.",
      ],
      certifications: ["Procedure approved by Germanischer Lloyd"],
      note: "A full report is handed over to the customer once the work is complete.",
    },
  },
  {
    slug: "bielles",
    fr: {
      title: "Bielles",
      summary:
        "Magnétoscopie, alésage CNC de l'œil de bielle, grenaillage de précontrainte et certification sur demande.",
      intro:
        "La rénovation des têtes de bielle restaure la géométrie et les portées d'appui aux spécifications du constructeur, avec contrôle non destructif préalable.",
      steps: [
        "Magnétoscopie pour la recherche de fissures.",
        "Usinage des portées d'appui entre corps et chapeau de bielle.",
        "Serrage conforme aux spécifications du constructeur.",
        "Alésage CNC de l'œil de bielle pour éliminer l'ovalisation.",
        "Grenaillage de précontrainte selon les spécifications du constructeur.",
        "Emballage de protection et conservation.",
      ],
      certifications: [
        "Lloyd's Register",
        "DNV",
        "ABS",
        "Bureau Veritas",
        "Nippon Kaiji Kyokai",
        "Germanischer Lloyd",
      ],
      note: "Certification délivrée sur demande par les principales sociétés de classification.",
    },
    en: {
      title: "Connecting rods",
      summary:
        "Magnetic particle inspection, CNC boring of the rod eye, shot peening and certification on request.",
      intro:
        "Reconditioning connecting rod big ends restores the geometry and bearing surfaces to the manufacturer's specifications, preceded by non-destructive testing.",
      steps: [
        "Magnetic particle inspection to detect cracks.",
        "Machining of the bearing surfaces between rod body and cap.",
        "Tightening in accordance with the manufacturer's specifications.",
        "CNC boring of the rod eye to eliminate ovality.",
        "Shot peening in accordance with the manufacturer's specifications.",
        "Protective packaging and preservation.",
      ],
      certifications: [
        "Lloyd's Register",
        "DNV",
        "ABS",
        "Bureau Veritas",
        "Nippon Kaiji Kyokai",
        "Germanischer Lloyd",
      ],
      note: "Certification issued on request by the main classification societies.",
    },
  },
];

export function getReconditioningServices(locale: Locale): ReconditioningService[] {
  return SERVICES.map((service) => ({ slug: service.slug, ...service[locale] }));
}

export function getReconditioningService(
  slug: string,
  locale: Locale,
): ReconditioningService | undefined {
  const service = SERVICES.find((item) => item.slug === slug);
  return service ? { slug: service.slug, ...service[locale] } : undefined;
}

export const RECONDITIONING_SLUGS = SERVICES.map((service) => service.slug);
