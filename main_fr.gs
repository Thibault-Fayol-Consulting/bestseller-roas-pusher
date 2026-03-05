/**
 * --------------------------------------------------------------------------
 * bestseller-roas-pusher - Google Ads Script for SMBs
 * --------------------------------------------------------------------------
 * Author: Thibault Fayol - Consultant SEA PME
 * Website: https://thibaultfayol.com
 * License: MIT
 * --------------------------------------------------------------------------
 */
var CONFIG = { TEST_MODE: true, MIN_ROAS: 5.0, MIN_CONVERSIONS: 2, HIGH_ROAS_LABEL: "High_ROAS_Product" };
function main() {
    if(!CONFIG.TEST_MODE) { AdsApp.createLabel(CONFIG.HIGH_ROAS_LABEL); }
    Logger.log("Scan des produits avec un ROAS > " + CONFIG.MIN_ROAS);
    var prodIter = AdsApp.productGroups().withCondition("Conversions >= " + CONFIG.MIN_CONVERSIONS).forDateRange("LAST_30_DAYS").get();
    var count = 0;
    while(prodIter.hasNext()){
        var prod = prodIter.next();
        var stats = prod.getStatsFor("LAST_30_DAYS");
        if (stats.getCost() > 0) {
            var roas = stats.getConversionValue() / stats.getCost();
            if (roas >= CONFIG.MIN_ROAS && !prod.isCustomLabel() && !prod.isOtherCase()) {
                Logger.log("Best-seller détecté : " + prod.getValue() + " | ROAS: " + roas.toFixed(2));
                count++;
            }
        }
    }
    Logger.log("Détecté " + count + " top ventes.");
}
