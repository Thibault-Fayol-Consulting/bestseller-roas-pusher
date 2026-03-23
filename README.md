# Bestseller ROAS Pusher

A Google Ads Script that identifies top-performing Shopping products by ROAS and labels them for campaign isolation or bid strategy adjustments.

## What It Does

- Queries Shopping product performance data via GAQL
- Identifies products exceeding configurable ROAS and conversion thresholds
- Applies a label to qualifying product groups for easy filtering
- Sends an email report listing all bestsellers ranked by ROAS
- Includes null guards for auto-bidding campaigns where MaxCpc is unavailable

## Setup

1. In Google Ads, go to **Tools > Bulk Actions > Scripts**
2. Click **+** to create a new script
3. Paste the contents of `main_en.gs` (or `main_fr.gs` for French)
4. Update the `CONFIG` block with your settings
5. **Authorize** the script when prompted
6. Set `TEST_MODE` to `false` when ready to apply labels
7. Schedule to run **weekly**

## CONFIG Reference

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `TEST_MODE` | boolean | `true` | When true, logs only. When false, creates labels and sends email. |
| `EMAIL` | string | — | Email address for report notifications. |
| `ROAS_THRESHOLD` | number | `5.0` | Minimum ROAS to qualify a product as a bestseller. |
| `MIN_CONVERSIONS` | number | `2` | Minimum conversions required in the date range. |
| `HIGH_ROAS_LABEL` | string | `High_ROAS_Product` | Label name applied to qualifying products. |
| `DATE_RANGE` | string | `LAST_30_DAYS` | GAQL date range for analysis. |

## How It Works

1. Queries `shopping_performance_view` for products meeting minimum conversion threshold
2. Calculates ROAS (conversion value / cost) for each product
3. Filters for products exceeding `ROAS_THRESHOLD`
4. Applies the configured label to matching product groups
5. Sends an email summary with ranked bestsellers

## After Labeling

Labeling alone does not change bids or budgets. The recommended workflow:

1. Run this script to identify and label bestsellers
2. In Google Ads, filter by the label to review products
3. Move labeled products to a dedicated campaign with higher budget
4. Apply an aggressive bid strategy to the dedicated campaign

## Requirements

- Google Ads account with active Shopping campaigns
- Script authorization for email

## Languages

- `main_en.gs` — English
- `main_fr.gs` — French

## License

MIT — Thibault Fayol Consulting
