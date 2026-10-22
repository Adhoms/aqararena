# Data model (draft)

Hierarchy: **Developer → Project → Typology (unit model) → Unit**.

Layouts, renders and 3D files are stored once per typology. Individual units only carry what differs: floor, orientation, price and availability. This keeps the data small even with hundreds of thousands of units.

```
Developer
 ├─ id, slug, name_ar, name_en, logo, cover, founded_year
 ├─ about_ar, about_en, website, hotline, whatsapp, hq_address
 ├─ verified, plan (BASIC | PRO | ENTERPRISE)
 └─ projects[]

Project
 ├─ id, slug, developer_id, name_ar, name_en
 ├─ area_id (e.g. New Cairo, Sheikh Zayed, New Capital, North Coast)
 ├─ location (PostGIS point), land_area_m2, footprint_pct
 ├─ status (LAUNCH | UNDER_CONSTRUCTION | READY | DELIVERED)
 ├─ launch_date, delivery_date, progress_pct
 ├─ amenities[], media[], master_plan (tiled image)
 ├─ payment_plans[], offers[], construction_updates[]
 └─ typologies[]

Typology (unit model, e.g. "Type A – 150 m²")
 ├─ id, project_id, code
 ├─ category (RESIDENTIAL | COMMERCIAL | ADMIN | MEDICAL | COASTAL)
 ├─ sub_type (apartment, duplex, villa, townhouse, clinic, office, retail, chalet …)
 ├─ bua_m2, net_m2, garden_m2, roof_m2, terrace_m2, bedrooms, bathrooms
 ├─ finishing (CORE_SHELL | SEMI | FULL | FULL_WITH_AC)
 ├─ floor_plan_2d, layout_sketch, model_3d (glTF/GLB), virtual_tour_url
 ├─ price_from, price_per_m2_from
 └─ units[]

Unit
 ├─ id, typology_id, building, floor, unit_number
 ├─ orientation, view, price
 └─ availability (AVAILABLE | RESERVED | SOLD)

PaymentPlan
 ├─ id, project_id (optional typology_id)
 ├─ down_payment_pct, delivery_payment_pct, years
 ├─ frequency (MONTHLY | QUARTERLY | SEMI_ANNUAL | ANNUAL)
 ├─ cash_discount_pct
 └─ maintenance_pct, garage_fee, club_fee

Lead
 ├─ id, project_id, typology_id?, name, phone, email?, message
 ├─ source (REQUEST_INFO | BOOK_VISIT)
 └─ status, created_at
```

## Reverse calculator

For each plan the approximate monthly payment is:

```
monthly = (price − down_payment − delivery_payment) / (years × 12)
```

Store `down_payment_amount` and `monthly_equivalent` as computed columns so "show me what I can afford" is a fast indexed query.
