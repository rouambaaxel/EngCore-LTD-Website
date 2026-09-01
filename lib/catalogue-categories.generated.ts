/**
 * ⚠️  FICHIER GÉNÉRÉ — NE PAS MODIFIER À LA MAIN.
 * Source : scripts/taxonomy.mjs — régénérer avec `npm run generate:categories`.
 *
 * 10 familles, 56 sous-catégories.
 */

import type { CatalogueCategory } from "@/lib/catalogue-data";

export const CATALOGUE_CATEGORIES: CatalogueCategory[] = [
  {
    "name": "Pièces détachées pour moteur diesel",
    "slug": "pieces-moteur",
    "name_en": "Diesel engine spare parts",
    "description_en": "Cylinder components, fuel system, auxiliaries, block and internal parts, lubrication and cooling.",
    "description": "Ensemble cylindre, système de carburant, organes auxiliaires, bloc et pièces internes, lubrification et refroidissement.",
    "image_url": "/images/products/industrial-pump.jpg",
    "parent_slug": null
  },
  {
    "name": "Électricité & électronique engin",
    "slug": "electricite-engin",
    "name_en": "Machine electrics & electronics",
    "description_en": "Control systems, sensors, switches, circuit protection, starting and charging, wiring.",
    "description": "Systèmes de commande, capteurs, commutateurs, protection de circuit, démarrage et charge, câblage.",
    "image_url": "/images/products/control-electronics.jpg",
    "parent_slug": null
  },
  {
    "name": "Joints, filtres & entretien",
    "slug": "joints-filtres-entretien",
    "name_en": "Seals, filters & maintenance",
    "description_en": "Filters, seal kits, maintenance consumables, sealing and fastening parts.",
    "description": "Filtres, pochettes de joints, consommables d'entretien, pièces d'étanchéité et de fixation.",
    "image_url": "/images/products/diesel-filter.jpg",
    "parent_slug": null
  },
  {
    "name": "Transmission & train de roulement",
    "slug": "transmission-train-roulement",
    "name_en": "Transmission & undercarriage",
    "description_en": "Crawler undercarriage, transmission, travel and swing mechanisms, braking, steering.",
    "description": "Train de chenille, transmission, mécanismes de translation et de rotation, freinage, direction.",
    "image_url": "/images/category-diesel.jpg",
    "parent_slug": null
  },
  {
    "name": "Hydraulique & pneumatique",
    "slug": "hydraulique-pneumatique",
    "name_en": "Hydraulic & pneumatic",
    "description_en": "Hydraulic pumps and motors, connections, valves, cylinders and pneumatic components.",
    "description": "Pompes et moteurs hydrauliques, raccords, distributeurs, vérins et composants pneumatiques.",
    "image_url": "/images/category-heavy-equipment.jpg",
    "parent_slug": null
  },
  {
    "name": "Cabine & carrosserie",
    "slug": "cabine-carrosserie",
    "name_en": "Cab & bodywork",
    "description_en": "Bodywork, cab controls, cab structure, locks and keys.",
    "description": "Carrosserie, commandes de cabine, structure de cabine, serrures et clés.",
    "image_url": "/images/products/industrial-valve.jpg",
    "parent_slug": null
  },
  {
    "name": "Climatisation & chauffage",
    "slug": "climatisation-chauffage",
    "name_en": "Air conditioning & heating",
    "description_en": "Air conditioning, cooling system components, ventilation and heating.",
    "description": "Climatisation, composants de refroidissement, ventilation et chauffage.",
    "image_url": "/images/products/industrial-machine.jpg",
    "parent_slug": null
  },
  {
    "name": "Outillage & accessoires",
    "slug": "outillage-accessoires",
    "name_en": "Tools & accessories",
    "description_en": "Hand tools, power tools and tool spare parts.",
    "description": "Outillage à main, électroportatif et pièces pour outillage.",
    "image_url": "/images/products/industrial-pipes.jpg",
    "parent_slug": null
  },
  {
    "name": "Machines & équipements",
    "slug": "machines-equipements",
    "name_en": "Machinery & equipment",
    "description_en": "Complete engine assemblies and machine attachments.",
    "description": "Moteurs complets et équipements rapportés.",
    "image_url": "/images/products/bearing.jpg",
    "parent_slug": null
  },
  {
    "name": "Appareillage électrique & instrumentation",
    "slug": "electrique-instrumentation",
    "name_en": "Electrical switchgear & instrumentation",
    "description_en": "Building and industrial switchgear: modular protection, consumer units, control and isolation, instrumentation.",
    "description": "Appareillage bâtiment et industriel : protection modulaire, tableaux, commande et sectionnement, instrumentation.",
    "image_url": "/images/products/S203MC6.png",
    "parent_slug": null
  },
  {
    "name": "Ensemble cylindre",
    "slug": "ensemble-cylindre",
    "name_en": "Cylinder components",
    "description_en": "Cylinder heads, liners, pistons, rings and valves.",
    "parent_slug": "pieces-moteur",
    "description": "Culasses, chemises, pistons, segments et soupapes.",
    "image_url": null
  },
  {
    "name": "Système de carburant",
    "slug": "systeme-carburant",
    "name_en": "Fuel system",
    "description_en": "Injectors, nozzles, injection pumps, fuel pumps and lines.",
    "parent_slug": "pieces-moteur",
    "description": "Injecteurs, buses, pompes à injection, pompes à carburant et canalisations.",
    "image_url": null
  },
  {
    "name": "Organes auxiliaires moteur",
    "slug": "auxiliaires-moteur",
    "name_en": "Engine auxiliary components",
    "description_en": "Starters, alternators, turbochargers, solenoids and governors.",
    "parent_slug": "pieces-moteur",
    "description": "Démarreurs, alternateurs, turbocompresseurs, solénoïdes et régulateurs.",
    "image_url": null
  },
  {
    "name": "Bloc & pièces internes",
    "slug": "bloc-pieces-internes",
    "name_en": "Block & internal parts",
    "description_en": "Cylinder blocks, crankshafts, camshafts, connecting rods and bearings.",
    "parent_slug": "pieces-moteur",
    "description": "Blocs-moteurs, vilebrequins, arbres à cames, bielles et coussinets.",
    "image_url": null
  },
  {
    "name": "Lubrification & refroidissement",
    "slug": "lubrification-refroidissement",
    "name_en": "Lubrication & cooling systems",
    "description_en": "Oil pumps, water pumps, radiators, thermostats and oil coolers.",
    "parent_slug": "pieces-moteur",
    "description": "Pompes à huile, pompes à eau, radiateurs, thermostats et refroidisseurs d'huile.",
    "image_url": null
  },
  {
    "name": "Échappement & dépollution",
    "slug": "echappement-depollution",
    "name_en": "Emission & exhaust system",
    "description_en": "Manifolds, mufflers, EGR valves and emission sensors.",
    "parent_slug": "pieces-moteur",
    "description": "Collecteurs, silencieux, vannes EGR et capteurs de dépollution.",
    "image_url": null
  },
  {
    "name": "Entraînement par courroie",
    "slug": "entrainement-courroie",
    "name_en": "Belt drive systems",
    "description_en": "Belts, tensioners, pulleys and fan clutches.",
    "parent_slug": "pieces-moteur",
    "description": "Courroies, tendeurs, poulies et embrayages de ventilateur.",
    "image_url": null
  },
  {
    "name": "Autres pièces moteur",
    "slug": "autres-pieces-moteur",
    "name_en": "Other engine parts",
    "description_en": "Engine parts that do not fall into the other families.",
    "parent_slug": "pieces-moteur",
    "description": "Pièces de moteur diesel ne relevant pas des autres familles.",
    "image_url": null
  },
  {
    "name": "Systèmes de commande",
    "slug": "systemes-commande",
    "name_en": "Control systems",
    "description_en": "Control modules, joysticks, actuators and speed governors.",
    "parent_slug": "electricite-engin",
    "description": "Calculateurs, joysticks, actionneurs et régulateurs de vitesse.",
    "image_url": null
  },
  {
    "name": "Capteurs & indicateurs",
    "slug": "capteurs-indicateurs",
    "name_en": "Indicators & sensing components",
    "description_en": "Pressure, temperature and speed sensors, gauges and displays.",
    "parent_slug": "electricite-engin",
    "description": "Capteurs de pression, de température et de régime, manomètres et afficheurs.",
    "image_url": null
  },
  {
    "name": "Commutateurs & interrupteurs",
    "slug": "commutateurs",
    "name_en": "Switches",
    "description_en": "Ignition switches, rocker switches and pressure switches.",
    "parent_slug": "electricite-engin",
    "description": "Contacteurs à clé, interrupteurs à bascule et manocontacts.",
    "image_url": null
  },
  {
    "name": "Protection & régulation de circuit",
    "slug": "protection-regulation",
    "name_en": "Circuit protection & regulation",
    "description_en": "Relays, contactors, fuses and voltage regulators.",
    "parent_slug": "electricite-engin",
    "description": "Relais, contacteurs, fusibles et régulateurs de tension.",
    "image_url": null
  },
  {
    "name": "Moteurs électriques & génération",
    "slug": "demarrage-charge",
    "name_en": "Motors & power generation",
    "description_en": "Wiper motors, fan motors, electric motors and generating sets.",
    "parent_slug": "electricite-engin",
    "description": "Moteurs d'essuie-glace, de ventilation, moteurs électriques et groupes générateurs.",
    "image_url": null
  },
  {
    "name": "Câblage & connectique",
    "slug": "cablage-connectique",
    "name_en": "Wiring & connections",
    "description_en": "Wiring harnesses, connectors and battery cables.",
    "parent_slug": "electricite-engin",
    "description": "Faisceaux, connecteurs et câbles de batterie.",
    "image_url": null
  },
  {
    "name": "Autres accessoires électriques",
    "slug": "autres-accessoires-electriques",
    "name_en": "Other electrical accessories",
    "description_en": "Lights, horns and other electrical accessories.",
    "parent_slug": "electricite-engin",
    "description": "Éclairages, avertisseurs et autres accessoires électriques.",
    "image_url": null
  },
  {
    "name": "Filtres",
    "slug": "filtres",
    "name_en": "Filters",
    "description_en": "Fuel, oil, air and hydraulic filters, filter kits and separators.",
    "parent_slug": "joints-filtres-entretien",
    "description": "Filtres à carburant, à huile, à air et hydrauliques, kits et séparateurs.",
    "image_url": null
  },
  {
    "name": "Pochettes de joints",
    "slug": "pochettes-joints",
    "name_en": "Seal kits",
    "description_en": "Cylinder, motor and valve seal kits, floating seals and O-rings.",
    "parent_slug": "joints-filtres-entretien",
    "description": "Kits de joints de vérin, de moteur et de distributeur, joints flottants et toriques.",
    "image_url": null
  },
  {
    "name": "Consommables d'entretien",
    "slug": "consommables-entretien",
    "name_en": "Maintenance components",
    "description_en": "Hoses, pipes, caps, grease valves and service accessories.",
    "parent_slug": "joints-filtres-entretien",
    "description": "Flexibles, tubes, bouchons, graisseurs et accessoires d'entretien.",
    "image_url": null
  },
  {
    "name": "Étanchéité & fixation",
    "slug": "etancheite-fixation",
    "name_en": "Sealing & fastening parts",
    "description_en": "Gaskets, oil seals, clamps, screws, bolts and nuts.",
    "parent_slug": "joints-filtres-entretien",
    "description": "Joints, bagues d'étanchéité, colliers, vis, boulons et écrous.",
    "image_url": null
  },
  {
    "name": "Train de chenille",
    "slug": "train-chenille",
    "name_en": "Crawler undercarriage parts",
    "description_en": "Track chains, rollers, idlers, sprockets and track shoes.",
    "parent_slug": "transmission-train-roulement",
    "description": "Chaînes, galets, roues folles, barbotins et patins de chenille.",
    "image_url": null
  },
  {
    "name": "Organes de transmission",
    "slug": "organes-transmission",
    "name_en": "Transmission parts",
    "description_en": "Gearboxes, clutches, universal joints and drive shafts.",
    "parent_slug": "transmission-train-roulement",
    "description": "Boîtes de vitesses, embrayages, cardans et arbres de transmission.",
    "image_url": null
  },
  {
    "name": "Translation & rotation",
    "slug": "translation-rotation",
    "name_en": "Travel & swing mechanism parts",
    "description_en": "Travel and swing motors, final drives and swing bearings.",
    "parent_slug": "transmission-train-roulement",
    "description": "Moteurs de translation et d'orientation, réducteurs et couronnes.",
    "image_url": null
  },
  {
    "name": "Freinage",
    "slug": "freinage",
    "name_en": "Brake system parts",
    "description_en": "Brake discs, pads, cylinders and brake valves.",
    "parent_slug": "transmission-train-roulement",
    "description": "Disques, plaquettes, cylindres et valves de frein.",
    "image_url": null
  },
  {
    "name": "Direction",
    "slug": "direction",
    "name_en": "Steering parts",
    "description_en": "Steering pumps, cylinders, tie rods and steering columns.",
    "parent_slug": "transmission-train-roulement",
    "description": "Pompes de direction, vérins, biellettes et colonnes de direction.",
    "image_url": null
  },
  {
    "name": "Suspension & levage",
    "slug": "suspension-levage",
    "name_en": "Suspension & lifting parts",
    "description_en": "Suspension components, lifting chains and forks.",
    "parent_slug": "transmission-train-roulement",
    "description": "Éléments de suspension, chaînes et fourches de levage.",
    "image_url": null
  },
  {
    "name": "Pompes & moteurs hydrauliques",
    "slug": "pompes-moteurs-hydrauliques",
    "name_en": "Hydraulic pumps & motors",
    "description_en": "Main pumps, gear pumps, vane pumps and hydraulic motors.",
    "parent_slug": "hydraulique-pneumatique",
    "description": "Pompes principales, à engrenages, à palettes et moteurs hydrauliques.",
    "image_url": null
  },
  {
    "name": "Raccords & flexibles",
    "slug": "raccords-flexibles",
    "name_en": "Connections",
    "description_en": "Quick couplings, fittings, adapters and hydraulic hoses.",
    "parent_slug": "hydraulique-pneumatique",
    "description": "Coupleurs rapides, raccords, adaptateurs et flexibles hydrauliques.",
    "image_url": null
  },
  {
    "name": "Distributeurs & vannes",
    "slug": "distributeurs-vannes",
    "name_en": "Hydraulic & pneumatic valves",
    "description_en": "Control valves, relief valves, solenoid valves and main valves.",
    "parent_slug": "hydraulique-pneumatique",
    "description": "Distributeurs, limiteurs de pression, électrovannes et blocs principaux.",
    "image_url": null
  },
  {
    "name": "Vérins & composants",
    "slug": "verins-composants",
    "name_en": "Hydraulic cylinders & components",
    "description_en": "Hydraulic cylinders, rods, bushings and cylinder components.",
    "parent_slug": "hydraulique-pneumatique",
    "description": "Vérins hydrauliques, tiges, bagues et composants de vérin.",
    "image_url": null
  },
  {
    "name": "Composants pneumatiques",
    "slug": "composants-pneumatiques",
    "name_en": "Pneumatic parts",
    "description_en": "Air compressors, air ends, grippers and pneumatic actuators.",
    "parent_slug": "hydraulique-pneumatique",
    "description": "Compresseurs, blocs-vis, préhenseurs et actionneurs pneumatiques.",
    "image_url": null
  },
  {
    "name": "Autres composants hydrauliques",
    "slug": "autres-hydraulique",
    "name_en": "Other hydraulic & pneumatic parts",
    "description_en": "Hydraulic and pneumatic parts outside the other families.",
    "parent_slug": "hydraulique-pneumatique",
    "description": "Composants hydrauliques et pneumatiques hors des autres familles.",
    "image_url": null
  },
  {
    "name": "Carrosserie",
    "slug": "carrosserie",
    "name_en": "Body parts",
    "description_en": "Mirrors, panels, covers, fenders and bodywork fittings.",
    "parent_slug": "cabine-carrosserie",
    "description": "Rétroviseurs, panneaux, capots, ailes et pièces de carrosserie.",
    "image_url": null
  },
  {
    "name": "Commandes & accessoires cabine",
    "slug": "commandes-cabine",
    "name_en": "Controls & accessories",
    "description_en": "Control levers, pedals, seats and operator accessories.",
    "parent_slug": "cabine-carrosserie",
    "description": "Leviers de commande, pédales, sièges et accessoires de poste de conduite.",
    "image_url": null
  },
  {
    "name": "Structure de cabine",
    "slug": "structure-cabine",
    "name_en": "Cab structure & components",
    "description_en": "Cab glass, doors, wipers and structural cab parts.",
    "parent_slug": "cabine-carrosserie",
    "description": "Vitrages, portes, essuie-glaces et éléments de structure de cabine.",
    "image_url": null
  },
  {
    "name": "Serrures & clés",
    "slug": "serrures-cles",
    "name_en": "Locks & keys",
    "description_en": "Ignition keys, door locks and latches.",
    "parent_slug": "cabine-carrosserie",
    "description": "Clés de contact, serrures de porte et loquets.",
    "image_url": null
  },
  {
    "name": "Climatisation",
    "slug": "climatisation",
    "name_en": "Air conditioning parts",
    "description_en": "Compressors, condensers, evaporators and expansion valves.",
    "parent_slug": "climatisation-chauffage",
    "description": "Compresseurs, condenseurs, évaporateurs et détendeurs.",
    "image_url": null
  },
  {
    "name": "Composants de refroidissement",
    "slug": "refroidissement-hvac",
    "name_en": "Cooling system components",
    "description_en": "Cooling fans, fan motors and cooling accessories.",
    "parent_slug": "climatisation-chauffage",
    "description": "Ventilateurs, moteurs de ventilateur et accessoires de refroidissement.",
    "image_url": null
  },
  {
    "name": "Ventilation",
    "slug": "ventilation",
    "name_en": "Ventilation parts",
    "description_en": "Blower motors, vents and ventilation ducts.",
    "parent_slug": "climatisation-chauffage",
    "description": "Moteurs de soufflerie, aérateurs et conduits de ventilation.",
    "image_url": null
  },
  {
    "name": "Chauffage",
    "slug": "chauffage",
    "name_en": "Heating parts",
    "description_en": "Heater cores, heating elements and heater controls.",
    "parent_slug": "climatisation-chauffage",
    "description": "Radiateurs de chauffage, résistances et commandes de chauffage.",
    "image_url": null
  },
  {
    "name": "Autres accessoires CVC",
    "slug": "autres-cvc",
    "name_en": "Other HVAC accessories",
    "description_en": "HVAC accessories outside the other families.",
    "parent_slug": "climatisation-chauffage",
    "description": "Accessoires de climatisation et chauffage hors des autres familles.",
    "image_url": null
  },
  {
    "name": "Outillage à main",
    "slug": "outillage-main",
    "name_en": "Hand tools",
    "description_en": "Wrenches, pullers, gauges and workshop hand tools.",
    "parent_slug": "outillage-accessoires",
    "description": "Clés, extracteurs, jauges et outillage d'atelier.",
    "image_url": null
  },
  {
    "name": "Outillage électroportatif",
    "slug": "outillage-electroportatif",
    "name_en": "Power tools",
    "description_en": "Powered workshop tools.",
    "parent_slug": "outillage-accessoires",
    "description": "Outillage d'atelier motorisé.",
    "image_url": null
  },
  {
    "name": "Pièces pour outillage",
    "slug": "pieces-outillage",
    "name_en": "Tool spare parts",
    "description_en": "Spare parts and consumables for workshop tools.",
    "parent_slug": "outillage-accessoires",
    "description": "Pièces de rechange et consommables pour outillage.",
    "image_url": null
  },
  {
    "name": "Moteurs complets",
    "slug": "moteurs-complets",
    "name_en": "Engine assembly",
    "description_en": "Complete engine assemblies and long blocks.",
    "parent_slug": "machines-equipements",
    "description": "Moteurs complets et blocs équipés.",
    "image_url": null
  },
  {
    "name": "Équipements rapportés",
    "slug": "equipements-attaches",
    "name_en": "Attachments",
    "description_en": "Buckets, breakers and machine attachments.",
    "parent_slug": "machines-equipements",
    "description": "Godets, brise-roches et équipements rapportés.",
    "image_url": null
  },
  {
    "name": "Disjoncteurs (MCB)",
    "slug": "disjoncteurs-mcb",
    "name_en": "Circuit breakers (MCB)",
    "description_en": "Miniature circuit breakers protecting against overloads and short circuits.",
    "parent_slug": "electrique-instrumentation",
    "description": "Disjoncteurs modulaires de protection contre surcharges et courts-circuits.",
    "image_url": "/images/products/S201B6X.jpg"
  },
  {
    "name": "Disjoncteurs différentiels (RCBO)",
    "slug": "disjoncteurs-differentiels-rcbo",
    "name_en": "Residual current breakers (RCBO)",
    "description_en": "Devices combining overcurrent protection with earth fault detection.",
    "parent_slug": "electrique-instrumentation",
    "description": "Disjoncteurs différentiels combinant protection contre les surintensités et les défauts à la terre.",
    "image_url": "/images/products/NHXS1B06.jpg"
  },
  {
    "name": "Détecteurs d'arc (AFDD)",
    "slug": "detecteurs-arc-afdd",
    "name_en": "Arc fault detection devices (AFDD)",
    "description_en": "Arc fault detection devices, additional protection against electrical fires.",
    "parent_slug": "electrique-instrumentation",
    "description": "Détecteurs de défaut d'arc, protection complémentaire contre les incendies d'origine électrique.",
    "image_url": "/images/products/wylex-nxsb06afd-6a-combined-rcbo-afdd-type-b.webp"
  },
  {
    "name": "Interrupteurs & protection générale",
    "slug": "interrupteurs-protection-generale",
    "name_en": "Main switches & general protection",
    "description_en": "Main switches, residual current devices and surge protection.",
    "parent_slug": "electrique-instrumentation",
    "description": "Interrupteurs généraux, interrupteurs différentiels et parafoudres.",
    "image_url": "/images/products/IT1002HighRes.png"
  },
  {
    "name": "Tableaux domestiques",
    "slug": "tableaux-domestiques",
    "name_en": "Domestic consumer units",
    "description_en": "Distribution boards for residential installations.",
    "parent_slug": "electrique-instrumentation",
    "description": "Tableaux de répartition pour installations résidentielles.",
    "image_url": "/images/products/F2004RAHighRes.jpeg"
  },
  {
    "name": "Tableaux triphasés & commerciaux",
    "slug": "tableaux-triphases-commerciaux",
    "name_en": "Three-phase & commercial boards",
    "description_en": "Three-phase distribution boards and cabinets for commercial buildings.",
    "parent_slug": "electrique-instrumentation",
    "description": "Tableaux de distribution triphasés et armoires pour bâtiments commerciaux.",
    "image_url": "/images/products/EPP-W304.png"
  },
  {
    "name": "Tableaux VE, garage & IP",
    "slug": "tableaux-ve-garage-ip",
    "name_en": "EV, garage & IP-rated units",
    "description_en": "Units for electric vehicle charging, garages and environments requiring an ingress protection rating.",
    "parent_slug": "electrique-instrumentation",
    "description": "Tableaux dédiés à la recharge de véhicules électriques, aux garages et aux environnements exigeant un indice de protection.",
    "image_url": "/images/products/MMGU40-SP.png"
  },
  {
    "name": "Coffrets & enveloppes",
    "slug": "coffrets-enveloppes",
    "name_en": "Enclosures & housings",
    "description_en": "Enclosures, housings and boxes for modular switchgear.",
    "parent_slug": "electrique-instrumentation",
    "description": "Coffrets, enveloppes et boîtiers de protection pour appareillage modulaire.",
    "image_url": "/images/products/PEN2.png"
  },
  {
    "name": "Commande & sectionnement",
    "slug": "commande-sectionnement",
    "name_en": "Control & isolation",
    "description_en": "Contactors, relays, time delays, rotary isolators, switchfuses and motor starters.",
    "parent_slug": "electrique-instrumentation",
    "description": "Contacteurs, relais, temporisations, sectionneurs rotatifs, interrupteurs-sectionneurs et démarreurs moteur.",
    "image_url": "/images/products/TD1.jpg"
  },
  {
    "name": "Accessoires & raccordement",
    "slug": "accessoires-raccordement",
    "name_en": "Accessories & connection",
    "description_en": "Blanks, busbars and DIN rail connectors, wiring accessories.",
    "parent_slug": "electrique-instrumentation",
    "description": "Obturateurs, peignes et connecteurs pour rail DIN, accessoires de câblage.",
    "image_url": "/images/products/MCBLDX.jpg"
  },
  {
    "name": "Instrumentation & mesure",
    "slug": "instrumentation-mesure",
    "name_en": "Instrumentation & metering",
    "description_en": "Transmitters, meters, variable speed drives and electrical process pumps.",
    "parent_slug": "electrique-instrumentation",
    "description": "Transmetteurs, compteurs, variateurs de vitesse et pompes électriques de process.",
    "image_url": "/images/products/KWH1M45.jpg"
  }
];
