-- Sequential order numbers. The previous format (`ORD-<epoch-ms>-<4 random
-- base36 chars>`) was ~20-24 characters and unpredictable-width, which broke
-- the invoice PDF's fixed-width layout. order_number_seq gives a Postgres-
-- guaranteed-unique, monotonically increasing value under concurrency; the
-- app formats it as `ORD-` + a 12-digit zero-padded number (16 characters
-- total, fixed width) — see generateOrderNumber() in orders.service.ts.
create sequence if not exists order_number_seq start 1;
