// The words on the Store's images (shots.html, logo.html), one set per language, as JSON. render.cjs renders every
// language here, and listing.test.ts checks they're the ones the app offers. The listing text makes the same claims, in
// ../localization/; change them together. Each title's last phrase, in <em>, is in the bolt colour. {count} is filled
// in from @uom/converters. `region` is the one its shots are taken in, where it isn't the shot's own: the language
// reaches readers in Europe, who should see their own voltages and number formats.
const CAPTIONS = {
  "en": {
    "tagline": "For the <em>electrical</em> trade",
    "facts": [
      "{count} converters",
      "US · Canada · Europe",
      "Works offline"
    ],
    "shots": {
      "promo": {
        "title": "Every number on the job, <em>converted.</em>",
        "text": "Wire sizes, voltage drop, prices and unit codes in one window, each answer with its formula."
      },
      "voltage-drop": {
        "title": "Will that wire carry the run? <em>Know first.</em>",
        "text": "Enter the run and the load: see the drop, and the smallest wire that keeps it within your target."
      },
      "price-units": {
        "title": "Per C, per M, <em>per each.</em>",
        "text": "Turn prices per 100 and per 1,000 into the price of one, and back, in one click."
      },
      "kva-amps": {
        "title": "From kVA to amps, <em>in one step.</em>",
        "text": "kVA, kW and amps, single- or three-phase, at the voltages your region uses."
      },
      "reels": {
        "title": "How many reels for this job? <em>Answered.</em>",
        "text": "Enter the run and the wires pulled: see how many coils or reels cover it."
      },
      "uom-codes": {
        "title": "Clean units in every <em>supplier file.</em>",
        "text": "Turn EA, ft, box or lbs into the UN/ECE codes BMEcat, ETIM and e-invoicing expect."
      }
    }
  },
  "es": {
    "region": "eu",
    "tagline": "Para el sector <em>eléctrico</em>",
    "facts": [
      "{count} conversores",
      "EE. UU. · Canadá · Europa",
      "Funciona sin conexión"
    ],
    "shots": {
      "promo": {
        "title": "Todas las cifras de la obra, <em>convertidas.</em>",
        "text": "Secciones de cable, caída de tensión, precios y códigos de unidad en una ventana, cada resultado con su fórmula."
      },
      "voltage-drop": {
        "title": "¿Aguanta ese cable el tendido? <em>Sépalo antes.</em>",
        "text": "Indique el tendido y la carga: vea la caída y el cable más pequeño que se mantiene dentro de su objetivo."
      },
      "price-units": {
        "title": "Por C, por M, <em>por unidad.</em>",
        "text": "Convierta precios por 100 y por 1.000 en el precio de una unidad, y al revés, con un clic."
      },
      "kva-amps": {
        "title": "De kVA a amperios, <em>en un paso.</em>",
        "text": "kVA, kW y amperios, monofásico o trifásico, con las tensiones de su región."
      },
      "reels": {
        "title": "¿Cuántas bobinas para este trabajo? <em>Resuelto.</em>",
        "text": "Indique el tendido y los cables: vea cuántos rollos o bobinas lo cubren."
      },
      "uom-codes": {
        "title": "Unidades limpias en cada <em>archivo de proveedor.</em>",
        "text": "Convierta EA, ft, box o lbs en los códigos UN/ECE que piden BMEcat, ETIM y la factura electrónica."
      }
    }
  },
  "de": {
    "region": "eu",
    "tagline": "Für das <em>Elektro</em>handwerk",
    "facts": [
      "{count} Umrechner",
      "USA · Kanada · Europa",
      "Funktioniert offline"
    ],
    "shots": {
      "promo": {
        "title": "Jede Zahl auf der Baustelle, <em>umgerechnet.</em>",
        "text": "Leitergrößen, Spannungsfall, Preise und Einheitencodes in einem Fenster, jedes Ergebnis mit seiner Formel."
      },
      "voltage-drop": {
        "title": "Reicht der Leiter für die Strecke? <em>Vorher wissen.</em>",
        "text": "Strecke und Last eingeben: Sie sehen den Spannungsfall und den kleinsten Leiter, der Ihr Ziel einhält."
      },
      "price-units": {
        "title": "Pro C, pro M, <em>pro Stück.</em>",
        "text": "Preise pro 100 und pro 1.000 in den Stückpreis umrechnen und zurück, mit einem Klick."
      },
      "kva-amps": {
        "title": "Von kVA zu Ampere, <em>in einem Schritt.</em>",
        "text": "kVA, kW und Ampere, ein- oder dreiphasig, mit den Spannungen Ihrer Region."
      },
      "reels": {
        "title": "Wie viele Trommeln für den Auftrag? <em>Beantwortet.</em>",
        "text": "Strecke und Leiter eingeben: Sie sehen, wie viele Ringe oder Trommeln reichen."
      },
      "uom-codes": {
        "title": "Saubere Einheiten in jeder <em>Lieferantendatei.</em>",
        "text": "EA, ft, box oder lbs in die UN/ECE-Codes umwandeln, die BMEcat, ETIM und die E-Rechnung erwarten."
      }
    }
  },
  "fr": {
    "region": "eu",
    "tagline": "Pour les métiers de l'<em>électricité</em>",
    "facts": [
      "{count} convertisseurs",
      "États-Unis · Canada · Europe",
      "Fonctionne hors ligne"
    ],
    "shots": {
      "promo": {
        "title": "Tous les chiffres du chantier, <em>convertis.</em>",
        "text": "Sections de fil, chute de tension, prix et codes d'unité dans une seule fenêtre, chaque résultat avec sa formule."
      },
      "voltage-drop": {
        "title": "Ce fil suffira-t-il pour le parcours ? <em>Sachez-le avant.</em>",
        "text": "Saisissez le parcours et la charge : voyez la chute et le plus petit fil qui respecte votre objectif."
      },
      "price-units": {
        "title": "Par C, par M, <em>à l'unité.</em>",
        "text": "Passez des prix par 100 et par 1 000 au prix unitaire, et inversement, en un clic."
      },
      "kva-amps": {
        "title": "Des kVA aux ampères, <em>en une étape.</em>",
        "text": "kVA, kW et ampères, en monophasé ou en triphasé, aux tensions de votre région."
      },
      "reels": {
        "title": "Combien de bobines pour ce chantier ? <em>Réponse immédiate.</em>",
        "text": "Saisissez le parcours et les fils tirés : voyez combien de couronnes ou de bobines il faut."
      },
      "uom-codes": {
        "title": "Des unités propres dans chaque <em>fichier fournisseur.</em>",
        "text": "Passez de EA, ft, box ou lbs aux codes UN/ECE qu'attendent BMEcat, ETIM et la facture électronique."
      }
    }
  }
};
