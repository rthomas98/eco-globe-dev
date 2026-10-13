# Manage internal market records

Use **Market records** in the admin portal to maintain buyer and seller research without creating a seller account. Entries remain internal, including entries labelled as confirmed streams. They do not create public listings, available stock, pickup addresses, or verified companies.

## Add or edit an entry

1. Sign in as an admin.
2. Open **Market records**.
3. Select **New record**.
4. Enter the company, role, feedstock, and source record type.
5. Add the facility, address, source citations, and research values that you know.
6. Save the record.

Leave an unknown price or volume blank. Enter zero only when zero is known. Negative research prices represent gate fees. Annual volumes describe capacity, not stock available for purchase.

To change an entry, open its detail page and select **Edit**. Supply a reason for the change. If another admin has changed the entry, reload its current version before submitting again.

## Review a field

Review the price, volume, and address separately. The source's “Checked by EcoGlobe” claim does not confirm these fields or a company's KYC status.

1. Open the record.
2. Select the field's review action.
3. Choose its review status.
4. Enter the supporting citation and the reason.
5. Save the review.

The app records the reviewing admin and time. A later change to a reviewed value, unit, currency, or associated citation resets that field's review.

## Remove or restore an entry

To remove an entry from the active register, select **Archive** and enter a reason. Archiving preserves the record and audit history.

To recover an entry, include archived records in the list, open the entry, and select **Restore**. Enter a reason for the restoration.

## Import a workbook

1. Open **Import workbook**.
2. Choose an `.xlsx` file using the supplied Sellers and Buyers template.
3. Create a preview.
4. Review the counts, proposed values, source claims, and row diagnostics.
5. Exclude any valid rows you do not want to import.
6. Enter an import reason.
7. Acknowledge the rows that will be created internally.
8. Commit the import.

The preview expires after 30 minutes. Upload the workbook again if the preview expires before the import starts. The parser rejects formulas, macros, embedded objects, and external workbook links. Passive HTTP or HTTPS links in the citation columns are retained as text.

Error rows are explicitly excluded from the commit. Duplicate and recognized footer rows are skipped. The import result shows the created, duplicate, excluded, and ignored counts.

If a commit response is lost, use **Retry import safely** without changing the choices. The same request returns the stored result. Reloading a completed import also shows its stored result.

Reimporting an identical entry does not overwrite an existing record. Duplicate detection includes archived records and identities retained before an edit. A workbook containing only duplicates can complete with zero new records.

## Check the result

Open **View imported records** to inspect that batch. Review an entry's audit history for the actor, reason, and changes. Export applies to the loaded records shown in the register.

Use the existing seller workflow when you need a tradable listing. This register has no conversion or publication action.
