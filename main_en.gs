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
    Logger.log("Scanning shopping products for ROAS > " + CONFIG.MIN_ROAS);
    var prodIter = AdsApp.productGroups().withCondition("Conversions >= " + CONFIG.MIN_CONVERSIONS).forDateRange("LAST_30_DAYS").get();
    var count = 0;
    while(prodIter.hasNext()){
        var prod = prodIter.next();
        var stats = prod.getStatsFor("LAST_30_DAYS");
        if (stats.getCost() > 0) {
            var roas = stats.getConversionValue() / stats.getCost();
            if (roas >= CONFIG.MIN_ROAS && !prod.isCustomLabel() && !prod.isOtherCase()) {
                Logger.log("Bestseller found: " + prod.getValue() + " | ROAS: " + roas.toFixed(2));
                // Script relies on campaign setup to filter by tag usually.
                count++;
            }
        }
    }
    Logger.log("Found " + count + " bestsellers.");
}
