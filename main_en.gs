/**
 * --------------------------------------------------------------------------
 * Bestseller ROAS Pusher — Google Ads Script
 * --------------------------------------------------------------------------
 * Identifies Shopping products with exceptional ROAS and labels them for
 * campaign isolation or bid strategy adjustments.
 *
 * Author:  Thibault Fayol — Thibault Fayol Consulting
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */

var CONFIG = {
  TEST_MODE: true,
  EMAIL: "you@domain.com",
  ROAS_THRESHOLD: 5.0,
  MIN_CONVERSIONS: 2,
  HIGH_ROAS_LABEL: "High_ROAS_Product",
  DATE_RANGE: "LAST_30_DAYS"
};

function main() {
  try {
    Logger.log("=== Bestseller ROAS Pusher ===");
    Logger.log("Mode: " + (CONFIG.TEST_MODE ? "TEST (dry run)" : "LIVE"));

    ensureLabel(CONFIG.HIGH_ROAS_LABEL);

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
      var cost = row.metrics.costMicros / 1000000;
      if (cost <= 0) continue;

      var roas = row.metrics.conversionsValue / cost;
      if (roas >= CONFIG.ROAS_THRESHOLD) {
        bestsellers.push({
          id: row.segments.productItemId || "(unknown)",
          title: row.segments.productTitle || "(no title)",
          conversions: row.metrics.conversions,
          convValue: row.metrics.conversionsValue,
          cost: cost,
          roas: roas,
          clicks: row.metrics.clicks,
          impressions: row.metrics.impressions
        });
      }
    }

    Logger.log("Bestsellers found: " + bestsellers.length);

    // Apply labels via product group iterator
    var labeledCount = 0;
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
          // Null guard for auto-bidding campaigns
          var maxCpc = prod.getMaxCpc();
          Logger.log("Bestseller: " + value + " | ROAS: " + idSet[value].roas.toFixed(2) +
                     " | MaxCpc: " + (maxCpc !== null ? maxCpc.toFixed(2) : "auto-bid"));

          if (!CONFIG.TEST_MODE) {
            prod.applyLabel(CONFIG.HIGH_ROAS_LABEL);
          }
          labeledCount++;
        }
      }
    }

    Logger.log("Products labeled: " + labeledCount);

    bestsellers.sort(function(a, b) { return b.roas - a.roas; });
    var logLimit = Math.min(bestsellers.length, 20);
    for (var j = 0; j < logLimit; j++) {
      var b = bestsellers[j];
      Logger.log("  " + b.id + " | " + b.title + " | ROAS: " + b.roas.toFixed(2) +
                 " | Conv: " + b.conversions + " | Cost: " + b.cost.toFixed(2));
    }

    if (bestsellers.length > 0) {
      sendReport(bestsellers, labeledCount);
    }

    Logger.log("=== Done ===");

  } catch (e) {
    Logger.log("ERROR: " + e.message);
    MailApp.sendEmail(CONFIG.EMAIL, "Bestseller ROAS Pusher — Script Error",
      "Error:\n\n" + e.message + "\n\nStack: " + e.stack);
  }
}

function ensureLabel(labelName) {
  var labelIter = AdsApp.labels().withCondition("label.name = '" + labelName + "'").get();
  if (!labelIter.hasNext()) {
    if (!CONFIG.TEST_MODE) {
      AdsApp.createLabel(labelName, "Auto-created by Bestseller ROAS Pusher");
      Logger.log("Created label: " + labelName);
    } else {
      Logger.log("Would create label: " + labelName + " (TEST_MODE)");
    }
  }
}

function sendReport(bestsellers, labeledCount) {
  var account = AdsApp.currentAccount().getName();
  var subject = "Bestseller ROAS Report: " + bestsellers.length + " products — " + account;

  var body = "Bestseller ROAS Pusher Report\n";
  body += "Account: " + account + "\n";
  body += "Date range: " + CONFIG.DATE_RANGE + "\n";
  body += "ROAS threshold: " + CONFIG.ROAS_THRESHOLD + "x\n";
  body += "Min conversions: " + CONFIG.MIN_CONVERSIONS + "\n";
  body += "Products qualifying: " + bestsellers.length + "\n";
  body += "Products labeled: " + labeledCount + "\n\n";
  body += "Top bestsellers by ROAS:\n";
  body += "-------------------------------------------\n";

  var limit = Math.min(bestsellers.length, 30);
  for (var i = 0; i < limit; i++) {
    var b = bestsellers[i];
    body += (i + 1) + ". " + b.title + "\n";
    body += "   ID: " + b.id + " | ROAS: " + b.roas.toFixed(2) + "x | Conv: " +
            b.conversions + " | Value: " + b.convValue.toFixed(2) + " | Cost: " + b.cost.toFixed(2) + "\n";
  }

  body += "\nNext step: Isolate labeled products into dedicated campaigns with higher budgets.\n";

  MailApp.sendEmail(CONFIG.EMAIL, subject, body);
  Logger.log("Report email sent to " + CONFIG.EMAIL);
}
