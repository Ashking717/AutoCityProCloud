# Software complaints resolution

The code changes address `software complaints.docx` and `SOFTWARE COMPLAINTS 1.docx`. No VPS or tenant database corrections were performed. The user explicitly excluded database changes; Al Thaer’s opening/bill figures, suspected duplicate purchases, and reportedly misplaced stock remain unverified and unchanged.

| Complaint | Implementation / remaining work |
| --- | --- |
| 1. Barcode label | Model, variant, year range, color, SKU, barcode and selling price. Unit cost is also shown using the Stock page's FIND MOTHER code (whole-number format), per the updated request. |
| 2. Purchase default location | A receiving-location selector applies to new cart lines; otherwise the product’s current location is suggested. Missing destinations require a choice. |
| 3. All purchase locations | Every active outlet location is selectable, including locations with no stock for that product. |
| 4. Product name search | Token matching across product name, SKU, barcode, make, model, variant and part number; literal punctuation; compatibility years; server lookup from purchase entry. |
| 5. Supplier in sales | Customer/supplier selector. New supplier credit sales reduce supplier payables by the unpaid amount. Legacy sales retain their original customer-receivable accounting; see compatibility below. |
| 6. Supplier journals | Supplier selector on journals, validated Accounts Payable entry, ledger attribution, draft posting and reversal support. |
| 7. Purchase return | Partial/full returns with source-location selection, supplier credit or received refund, stock movements, accounting voucher and printable return document. |
| 8. Al Thaer opening | Opening corrections use signed ledger values, including reversals, and support zero. Actual tenant correction is excluded at the user’s request. |
| 9. Vehicle variant | Search results, cart and purchase details show vehicle details. Existing purchases fall back to the current product metadata when no snapshot exists. |
| 10. Supplier bill narration | Bill number and narration on creation and purchase editing. Bill numbers are unique per supplier/outlet for active new or edited records. |
| 11. Products in Main Store | Legacy transfers and product-edit stock allocation tested. Actual misplaced products/destinations require tenant data; no bulk relocation is inferred. |
| 12. Duplicate purchase cancellation | Audited cancellation reverses bill-specific postings and removes stock from the receiving location. Missing stock or unreconciled legacy GL blocks cancellation. Suspected records await inspection. |
| 13. Supplier bill balances | Per-bill payable/credit view; supplier-payment allocations included; opening balances, journals and unallocated payments shown separately. |
| 14. Purchase amount editing | Unit-price/tax corrections, bill details, reason and history. Excess payment can become supplier credit or a received refund. Stale edits are rejected. |

## Follow-up complaints

| Complaint | Code change |
| --- | --- |
| Product search | Includes legacy products without `isActive`, numeric legacy identifiers, embedded part-number spaces, and Arabic digits. Sales filters run before the server result limit; stale product responses are ignored. |
| Supplier opening DR/CR | Explicit DR/CR selector; unsigned input maps to a signed opening ledger amount. Existing nonnegative API requests default to CR. |
| Supplier ledger loading | Selected-supplier requests query only relevant purchases and AP references; sorted ledger queries permit disk use. Failures are visible with retry. The exact production failure was not inspected. |
| Arabic barcode price | Selling price appears in English and Arabic numerals alongside the existing FIND MOTHER cost code. |
| Journal visibility | Server journal filtering, literal search, pagination, and expandable account/debit/credit lines. The API registers the User model before populating creators. |
| Split bill payments and discounts | Multiple tender methods plus a fixed QAR settlement discount, with separate cash and discount amounts in payment history. |
| Supplier credit sale | New supplier sales debit AP for the unpaid amount. Returns, edits, and cancellations reverse the corresponding supplier effect. |
| Al Thaer stored records | Explicitly excluded; no hardcoded supplier amounts or data-repair execution. |

## Accounting behavior

Corrections commit purchase, stock, supplier, voucher and ledger effects in one transaction. An operation key prevents replay. Existing ledger and stock movement rows remain immutable. Cancelling a genuinely duplicated recording is distinct from returning goods actually purchased. Bill-specific cash payments are reversed on cancellation; supplier-level payments remain recorded and may become supplier credit.

Price corrections apportion the value change between current inventory and cost of goods sold, using current quantity capped at the purchased quantity. This is an adjustment under the existing weighted-cost model, not batch/FIFO reconstruction. Return stock is removed at current weighted cost, with the price difference posted to cost of goods sold. Amount edits after returns are blocked to preserve the return’s historical amounts. Legacy purchases lacking their original posted accounting need reconciliation before financial correction.

Purchase corrections also support changing the supplier, including paid purchases and purchases with returns. The corrected supplier receives the bill and its linked payments. Allocated supplier-wide payments get an explicit, balanced AP reclassification for just this bill's share; the original payment and all cash/stock entries remain intact. Repeated supplier changes do not duplicate that reclassification. Cancellation reverses it and refreshes both suppliers. Supplier changes require a reason and retain the old supplier in history. Reports attribute purchase-linked entries to the current corrected supplier, including earlier reporting periods; original vouchers remain unchanged.

Settlement discounts debit AP and credit the Purchase Settlement Discounts system account (`DISC-001`); actual tender amounts credit cash/bank accounts. Discounts are allocated to remaining purchase items with cumulative cent rounding. Returns reverse the allocated discount and refund/credit the net amount. Cancellation reverses the settlement voucher, including tenders and discount. A fully discounted return is still treated as a return even when its net amount is zero. The payment dialog scrolls within the viewport when multiple methods are added.

New supplier sales persist `supplierSettlementMode: PAYABLE_OFFSET`. Only sales with that flag use supplier AP; the linked customer remains an identity record without a duplicate receivable. Existing sales without the flag continue using their original receivable path, including later cancellation. No migration, automatic historical conversion, or existing-product rewrite is included. Missing purchase-discount fields mean zero, and the new discount system account is created through the existing transactional account seeding when needed for subsequent operations.

## Verification

TypeScript checks and the production build passed.

All 166 isolated regression scenarios passed. The suite covers the existing sales/inventory behavior and the complaint workflows, including concurrent returns, fractional quantities, tax rounding, rollback, idempotency, supplier opening reversals, journal reversal, supplier reassignment with allocated payments/returns/cancellation, and balanced complete ledger postings. It only runs against a disposable local database on port 27029. The initial purchase form, printable return voucher and label layout (50 × 30 mm and 38 × 25 mm) were also checked in the browser; physical printer/scanner verification remains a deployment check.

Browser checks verified expanded journal account lines, purchase history separating actual payment and discount, the split-payment dialog, and Arabic selling-price output at 38 × 25 mm. Physical printer/scanner verification remains necessary. Additional integration cases cover signed opening changes, discount-only settlement, split tenders, replay/rollback, fractional and multi-line taxed returns, cancellation, supplier reassignment, supplier sale edit/return/cancellation, and preservation of legacy sale accounting.

## Tenant investigation

Tenant investigation and corrections are currently out of scope. If explicitly resumed later, configure `MONGODB_URI` locally and set `AUDIT_OUTLET_ID` for a multi-outlet database. Run `npx tsx scripts/audit-purchase-complaints.ts`. The script uses raw read-only queries and does not create indexes, migrate records or update balances. It reports matching duplicate candidates and Al Thaer’s bills, payments, opening vouchers and ledger entries. Override `AUDIT_SUPPLIER_PATTERN` if the supplier is stored with a different spelling. Matching purchases are candidates for review, not proof of duplication.
