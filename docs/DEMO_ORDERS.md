# Saved buy/sell demo

Approved scope: all listings, vertically stacked Seller/Buyer demo buttons, saved orders visible in Buyer Orders, Seller Sales and Admin Transactions. Payment and shipping are simulated.

The backend enables `/api/demo-orders` only with `ECOGLOBE_DEMO_ORDERS=true`. Enable only on the EcoGlobe development Container App. A transaction and application lock create additive DemoOrders and DemoOrderEvents tables on first use. Existing tables and data are not modified. No real order, inventory, payment, carrier, settlement or document verification is written.

An active company can create a demo order against a published listing. Prices are read server-side; missing prices become zero for demonstration only. Demo quantities do not require MOQ or available inventory. Both participating companies and internal admins may view and advance the demo through submission, acceptance, simulated funding, dispatch, delivery and settlement. Cancellation is available until settlement and represents a simulated refund. Every transition records the actor and time. Terminal states cannot be reopened. Other companies cannot access the order.

Use the Full Buy / Sell demo on a listing, enter quantity and a fictional delivery address, and create a demo order. Open My Orders and advance each step; the same record appears in Seller Sales and Admin Transactions. Refresh the demo panel to retrieve changes from another portal. The demo sample document is explicitly not a valid SDS. Live SDS status is unchanged.

Validation: domain tests cover sequential transitions, cancellation and terminal-state protection. Complete live portal verification must be recorded separately; do not infer it from these tests.
