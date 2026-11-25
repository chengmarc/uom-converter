// The words on Google Play's images, one set per language, as JSON: the feature graphic's tagline (feature.html), and
// the headline and text on the phone screenshots (shots.html). Tablet screenshots have none: Google asks them to show
// only the app. render.cjs renders every language here, and @uom/test's android/listing.test.ts checks they're the ones
// the app offers. The listing text makes the same claims, in ../localization/; change them together. Each title's last
// phrase, in <em>, is in the bolt colour. `region` is the one its shots are taken in, where it isn't the shot's own: the
// language reaches readers in Europe, who should see their own voltages and number formats.
const CAPTIONS = {
  "en": {
    "tagline": "For the <em>electrical</em> trade",
    "shots": {
      "home": {
        "title": "Every number on the job, <em>converted.</em>",
        "text": "Wire sizes, voltage drop, prices and unit codes, with the ones you use first."
      },
      "vdrop": {
        "title": "Will that wire carry the run? <em>Know first.</em>",
        "text": "See the drop, and the smallest wire that keeps it within your target."
      },
      "price-units": {
        "title": "Per C, per M, <em>per each.</em>",
        "text": "Turn prices per 100 and per 1,000 into the price of one, and back."
      },
      "awg": {
        "title": "AWG to mm², <em>and back.</em>",
        "text": "North American wire sizes to metric, with the nearest and next larger size."
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
    "shots": {
      "home": {
        "title": "Todas las cifras de la obra, <em>convertidas.</em>",
        "text": "Secciones de cable, caída de tensión, precios y códigos de unidad, los que más usa primero."
      },
      "vdrop": {
        "title": "¿Aguanta ese cable? <em>Sépalo antes.</em>",
        "text": "Vea la caída y el cable más pequeño que se mantiene dentro de su objetivo."
      },
      "price-units": {
        "title": "Por C, por M, <em>por unidad.</em>",
        "text": "Convierta precios por 100 y por 1.000 en el precio de una unidad, y al revés."
      },
      "awg": {
        "title": "AWG a mm², <em>y al revés.</em>",
        "text": "Calibres norteamericanos a métrico, con la sección más cercana y la siguiente mayor."
      },
      "uom-codes": {
        "title": "Unidades limpias en <em>cada archivo.</em>",
        "text": "Convierta EA, ft, box o lbs en los códigos UN/ECE que piden BMEcat, ETIM y la factura electrónica."
      }
    }
  },
  "de": {
    "region": "eu",
    "tagline": "Für das <em>Elektro</em>handwerk",
    "shots": {
      "home": {
        "title": "Jede Zahl auf dem Bau, <em>umgerechnet.</em>",
        "text": "Leitergrößen, Spannungsfall, Preise und Einheitencodes, Ihre meistgenutzten zuerst."
      },
      "vdrop": {
        "title": "Reicht der Leiter? <em>Vorher wissen.</em>",
        "text": "Sehen Sie den Spannungsfall und den kleinsten Leiter, der Ihr Ziel einhält."
      },
      "price-units": {
        "title": "Pro C, pro M, <em>pro Stück.</em>",
        "text": "Preise pro 100 und pro 1.000 in den Stückpreis umrechnen und zurück."
      },
      "awg": {
        "title": "AWG in mm² <em>und zurück.</em>",
        "text": "Nordamerikanische Leitergrößen ins Metrische, mit der nächsten und der nächstgrößeren Größe."
      },
      "uom-codes": {
        "title": "Saubere Einheiten in <em>jeder Datei.</em>",
        "text": "EA, ft, box oder lbs in die UN/ECE-Codes umwandeln, die BMEcat, ETIM und die E-Rechnung erwarten."
      }
    }
  },
  "fr": {
    "region": "eu",
    "tagline": "Pour les métiers de l'<em>électricité</em>",
    "shots": {
      "home": {
        "title": "Tous les chiffres du chantier, <em>convertis.</em>",
        "text": "Sections de fil, chute de tension, prix et codes d'unité, ceux que vous utilisez le plus en tête."
      },
      "vdrop": {
        "title": "Ce fil suffira-t-il ? <em>Sachez-le avant.</em>",
        "text": "Voyez la chute et le plus petit fil qui respecte votre objectif."
      },
      "price-units": {
        "title": "Par C, par M, <em>à l'unité.</em>",
        "text": "Passez des prix par 100 et par 1 000 au prix unitaire, et inversement."
      },
      "awg": {
        "title": "AWG en mm², <em>et inversement.</em>",
        "text": "Calibres nord-américains vers le métrique, avec la taille la plus proche et la suivante."
      },
      "uom-codes": {
        "title": "Des unités propres dans <em>chaque fichier.</em>",
        "text": "Passez de EA, ft, box ou lbs aux codes UN/ECE qu'attendent BMEcat, ETIM et la facture électronique."
      }
    }
  }
};
