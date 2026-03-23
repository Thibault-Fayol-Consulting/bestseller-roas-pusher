/**
 * --------------------------------------------------------------------------
 * Bestseller ROAS Pusher — Script Google Ads
 * --------------------------------------------------------------------------
 * Identifie les produits Shopping avec un ROAS exceptionnel et les etiquette
 * pour isolation en campagne dediee ou ajustement d'encheres.
 *
 * Auteur:  Thibault Fayol — Thibault Fayol Consulting
 * Site:    https://thibaultfayol.com
 * Licence: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: "vous@domaine.com",
  ROAS_THRESHOLD: 5.0,
  MIN_CONVERSIONS: 2,
  HIGH_ROAS_LABEL: "High_ROAS_Product",
  DATE_RANGE: "LAST_30_DAYS"
};

function main() {
  try {
    Logger.log("=== Bestseller ROAS Pusher ===");
    Logger.log("Mode : " + (CONFIG.TEST_MODE ? "TEST (simulation)" : "PRODUCTION"));

    verifierLabel(CONFIG.HIGH_ROAS_LABEL);

    var query =
      "SELECT segments.product_item_id, segments.product_title, " +
      "metrics.conversions, metrics.conversions_value, metrics.cost_micros, " +
      "metrics.clicks, metrics.impressions, " +
      "shopping_performance_view.resource_name " +
      "FROM shopping_performance_view " +
      "WHERE segments.date DURING " + CONFIG.DATE_RANGE + " " +
      "AND metrics.conversions >= " + CONFIG.MIN_CONVERSIONS;

    var rows = AdsApp.search(query);
    var bestsellers = [];

    while (rows.hasNext()) {
      var row = rows.next();
      var cout = row.metrics.costMicros / 1000000;
      if (cout <= 0) continue;

      var roas = row.metrics.conversionsValue / cout;
      if (roas >= CONFIG.ROAS_THRESHOLD) {
        bestsellers.push({
          id: row.segments.productItemId || "(inconnu)",
          titre: row.segments.productTitle || "(sans titre)",
          conversions: row.metrics.conversions,
          valeurConv: row.metrics.conversionsValue,
          cout: cout,
          roas: roas,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions
        });
      }
    }

    Logger.log("Bestsellers trouves : " + bestsellers.length);

    var nbEtiquetes = 0;
    if (bestsellers.length > 0) {
      var idSet = {};
      for (var i = 0; i < bestsellers.length; i++) {
        idSet[bestsellers[i].id] = bestsellers[i];
      }

      var prodIter = AdsApp.shoppingProductGroups().get();
      while (prodIter.hasNext()) {
        var prod = prodIter.next();
        var value = prod.getValue();
        if (value && idSet[value]) {
          var maxCpc = prod.getMaxCpc();
          Logger.log("Bestseller : " + value + " | ROAS: " + idSet[value].roas.toFixed(2) +
                     " | MaxCpc : " + (maxCpc !== null ? maxCpc.toFixed(2) : "encheres auto"));

          if (!CONFIG.TEST_MODE) {
            prod.applyLabel(CONFIG.HIGH_ROAS_LABEL);
          }
          nbEtiquetes++;
        }
      }
    }

    Logger.log("Produits etiquetes : " + nbEtiquetes);

    bestsellers.sort(function(a, b) { return b.roas - a.roas; });
    var logLimit = Math.min(bestsellers.length, 20);
    for (var j = 0; j < logLimit; j++) {
      var b = bestsellers[j];
      Logger.log("  " + b.id + " | " + b.titre + " | ROAS: " + b.roas.toFixed(2) +
                 " | Conv: " + b.conversions + " | Cout: " + b.cout.toFixed(2));
    }

    if (bestsellers.length > 0) {
      envoyerRapport(bestsellers, nbEtiquetes);
    }

    Logger.log("=== Termine ===");

  } catch (e) {
    Logger.log("ERREUR : " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, "Bestseller ROAS Pusher — Erreur Script",
      "Erreur :\n\n" + e.message + "\n\nStack : " + e.stack);
  }
}

function verifierLabel(nomLabel) {
  var labelIter = AdsApp.labels().withCondition("label.name = '" + nomLabel + "'").get();
  if (!labelIter.hasNext()) {
    if (!CONFIG.TEST_MODE) {
      AdsApp.createLabel(nomLabel, "Cree automatiquement par Bestseller ROAS Pusher");
      Logger.log("Label cree : " + nomLabel);
    } else {
      Logger.log("Creerait le label : " + nomLabel + " (TEST_MODE)");
    }
  }
}

function envoyerRapport(bestsellers, nbEtiquetes) {
  var compte = AdsApp.currentAccount().getName();
  var sujet = "Rapport ROAS Bestsellers : " + bestsellers.length + " produits — " + compte;

  var corps = "Rapport Bestseller ROAS Pusher\n";
  corps += "Compte : " + compte + "\n";
  corps += "Periode : " + CONFIG.DATE_RANGE + "\n";
  corps += "Seuil ROAS : " + CONFIG.ROAS_THRESHOLD + "x\n";
  corps += "Conversions min : " + CONFIG.MIN_CONVERSIONS + "\n";
  corps += "Produits qualifies : " + bestsellers.length + "\n";
  corps += "Produits etiquetes : " + nbEtiquetes + "\n\n";
  corps += "Top bestsellers par ROAS :\n";
  corps += "-------------------------------------------\n";

  var limit = Math.min(bestsellers.length, 30);
  for (var i = 0; i < limit; i++) {
    var b = bestsellers[i];
    corps += (i + 1) + ". " + b.titre + "\n";
    corps += "   ID: " + b.id + " | ROAS: " + b.roas.toFixed(2) + "x | Conv: " +
             b.conversions + " | Valeur: " + b.valeurConv.toFixed(2) + " | Cout: " + b.cout.toFixed(2) + "\n";
  }

  corps += "\nProchaine etape : isoler les produits etiquetes dans des campagnes dediees.\n";

  MailApp.sendEmail(CONFIG.EMAIL, sujet, corps);
  Logger.log("Email de rapport envoye a " + CONFIG.EMAIL);
}
