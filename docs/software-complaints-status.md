# Software complaints resolution

The code changes address the workflows reported in `software complaints.docx`. Tenant records have not been changed. The tenant database connection is not configured in this checkout, so Al Thaer’s actual balance, the suspected duplicate purchases, and the products reportedly left in Main Store still require investigation against that database.

| Complaint | Implementation / remaining work |
| --- | --- |
| 1. Barcode label | Model, variant, year range, SKU, barcode and selling price. Unit cost is also shown using the Stock page's FIND MOTHER code (whole-number format), per the updated request. |
| 2. Purchase default location | A receiving-location selector applies to new cart lines; otherwise the product’s current location is suggested. Missing destinations require a choice. |
| 3. All purchase locations | Every active outlet location is selectable, including locations with no stock for that product. |
| 4. Product name search | Token matching across product name, SKU, barcode, make, model, variant and part number; literal punctuation; compatibility years; server lookup from purchase entry. |
| 5. Supplier in sales | Customer/supplier selector. Supplier sales use a linked customer receivable, separate from purchase payables. |
| 6. Supplier journals | Supplier selector on journals, validated Accounts Payable entry, ledger attribution, draft posting and reversal support. |
| 7. Purchase return | Partial/full returns with source-location selection, supplier credit or received refund, stock movements, accounting voucher and printable return document. |
| 8. Al Thaer opening | Opening corrections use signed ledger values, including reversals, and support zero. Actual record investigation awaits the tenant connection. |
| 9. Vehicle variant | Search results, cart and purchase details show vehicle details. Existing purchases fall back to the current product metadata when no snapshot exists. |
| 10. Supplier bill narration | Bill number and narration on creation and purchase editing. Bill numbers are unique per supplier/outlet for active new or edited records. |
| 11. Products in Main Store | Legacy transfers and product-edit stock allocation tested. Actual misplaced products/destinations require tenant data; no bulk relocation is inferred. |
| 12. Duplicate purchase cancellation | Audited cancellation reverses bill-specific postings and removes stock from the receiving location. Missing stock or unreconciled legacy GL blocks cancellation. Suspected records await inspection. |
| 13. Supplier bill balances | Per-bill payable/credit view; supplier-payment allocations included; opening balances, journals and unallocated payments shown separately. |
| 14. Purchase amount editing | Unit-price/tax corrections, bill details, reason and history. Excess payment can become supplier credit or a received refund. Stale edits are rejected. |

## Accounting behavior

Corrections commit purchase, stock, supplier, voucher and ledger effects in one transaction. An operation key prevents replay. Existing ledger and stock movement rows remain immutable. Cancelling a genuinely duplicated recording is distinct from returning goods actually purchased. Bill-specific cash payments are reversed on cancellation; supplier-level payments remain recorded and may become supplier credit.

Price corrections apportion the value change between current inventory and cost of goods sold, using current quantity capped at the purchased quantity. This is an adjustment under the existing weighted-cost model, not batch/FIFO reconstruction. Return stock is removed at current weighted cost, with the price difference posted to cost of goods sold. Amount edits after returns are blocked to preserve the return’s historical amounts. Legacy purchases lacking their original posted accounting need reconciliation before financial correction.

## Verification

TypeScript checks and the production build passed.

All 129 isolated regression scenarios passed. The suite covers the existing sales/inventory behavior and the complaint workflows, including concurrent returns, fractional quantities, tax rounding, rollback, idempotency, supplier opening reversals, journal reversal and balanced complete ledger postings. It only runs against a disposable local database on port 27029. The purchase form, printable return voucher and selling-price-only labels (50 × 30 mm and 38 × 25 mm) were also checked in the browser; physical printer/scanner verification remains a deployment check.

## Tenant investigation

Configure `MONGODB_URI` locally and set `AUDIT_OUTLET_ID` for a multi-outlet database. Run `npx tsx scripts/audit-purchase-complaints.ts`. The script uses raw read-only queries and does not create indexes, migrate records or update balances. It reports matching duplicate candidates and Al Thaer’s bills, payments, opening vouchers and ledger entries. Override `AUDIT_SUPPLIER_PATTERN` if the supplier is stored with a different spelling. Matching purchases are candidates for review, not proof of duplication.
