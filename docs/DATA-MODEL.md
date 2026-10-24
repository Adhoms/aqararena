# Data model

Hierarchy: **Developer → Project → Typology (unit model)**. Every text field the visitor reads has an Arabic and an English version (`nameAr` / `nameEn`).

Floor plans, renders and 3D files are stored once per typology, not per unit. The `Unit` table exists for later (building, floor, availability) but the public site does not need it yet.

```
Developer
 ├─ slug, nameAr/En, logo, cover, foundedYear, aboutAr/En
 ├─ official contacts: hotline, salesPhone, whatsapp, email, website, hqAddress
 ├─ verified, plan (BASIC | PRO | ENTERPRISE)
 └─ projects[]

Project
 ├─ slug, developer, area (Area tree: Cairo › New Cairo › Fifth Settlement)
 ├─ nameAr/En, descriptionAr/En, districtAr/En, categories[]
 ├─ latitude/longitude (PostGIS point later, for map search), landAreaM2, footprintPct, unitsCount
 ├─ pricesUpdatedAt (when the developer last confirmed prices)
 ├─ status (LAUNCH | UNDER_CONSTRUCTION | READY | DELIVERED)
 ├─ launchDate, deliveryDate, progressPct, amenities[]
 ├─ masterPlanUrl (tiled image) + zones[]      → MasterPlanZone
 ├─ typologies[]                               → unit types
 ├─ paymentPlans[], offers[]
 ├─ media[] (photos grouped EXTERIOR | INTERIOR | CONSTRUCTION)
 └─ distances[]                                → "Ring Road · 10 min"

MasterPlanZone (one clickable area on the master plan)
 ├─ kind (RESIDENTIAL | VILLAS | GREEN | AMENITY | COMMERCIAL | ADMINISTRATIVE)
 ├─ shortAr/En (label on the plan), nameAr/En, phaseAr/En, descriptionAr/En
 ├─ areaFeddan, buildingsCount, unitsCount, unitSubTypes[]
 └─ xPct, yPct, widthPct, heightPct (rectangle in % of the plan image)

Typology (unit model, e.g. "Type B – 165 m²")
 ├─ code, category, subType (apartment, duplex, villa, clinic, office, retail, chalet …)
 ├─ buaM2, netM2, gardenM2, roofM2, terraceM2, bedrooms, bathrooms
 ├─ finishing (CORE_AND_SHELL | SEMI_FINISHED | FULLY_FINISHED | …)
 └─ priceFrom, pricePerM2From, media[] (floor plan, 3D)

PaymentPlan
 ├─ nameAr/En, downPaymentPct, deliveryPaymentPct, years
 ├─ frequency (MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL), cashDiscountPct
 └─ maintenancePct, garageFee, clubFee
```

## Comparison

Compared projects are summarised from their typologies and plans:

- starting price = lowest `priceFrom`
- average price per m² = average of `priceFrom / buaM2`
- lowest down payment, longest installment term, highest cash discount = across active plans

An example installment on a plan is `(price − down payment − delivery payment) / number of installments`.
