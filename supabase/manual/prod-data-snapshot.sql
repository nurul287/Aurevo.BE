--
-- PostgreSQL database dump
--

\restrict VaPpKYQ1KE4auosviGAfxvYHdL5bPLJUO9zRJFR5cAMhYrnd84BISADgCObieil

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: brands; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.brands (id, name, slug, description, logo_url, website_url, is_active, created_at, updated_at) FROM stdin;
a55b6fce-fbf8-4121-9825-feb898bd1f24	Nike	nike		\N	\N	t	2026-05-13 16:45:41.977475+00	2026-05-13 16:45:41.977475+00
\.


--
-- Data for Name: categories; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.categories (id, name, slug, description, parent_id, image_url, sort_order, is_active, created_at, updated_at) FROM stdin;
32bc639e-153f-46bc-83bd-a86b6d0d8e58	SNEAKERS	sneakers		\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/categories/32bc639e-153f-46bc-83bd-a86b6d0d8e58/cover.png	1	t	2026-05-13 09:52:10.911398+00	2026-05-15 06:46:06.911233+00
dec4edb1-4b15-4842-a00f-5392e3d04797	CAP	mans		\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/categories/dec4edb1-4b15-4842-a00f-5392e3d04797/cover.png	2	t	2026-05-13 14:35:49.512868+00	2026-05-15 06:46:15.821441+00
46241d06-88ee-40e4-981e-ffb99b7239e5	T-SHART	t-shart		\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/categories/46241d06-88ee-40e4-981e-ffb99b7239e5/cover.png	3	t	2026-05-13 13:03:42.754526+00	2026-05-15 06:46:25.682178+00
6f94fe7d-5e4b-4c12-825f-f5a4dc667d47	FORMAL SHOE	formal-shoe		\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/categories/6f94fe7d-5e4b-4c12-825f-f5a4dc667d47/cover.png	6	t	2026-05-13 15:06:04.053278+00	2026-05-15 06:46:36.120189+00
589b943c-8f16-4ba1-bc6e-afe96f544a31	PANJABI	panjabi		\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/categories/589b943c-8f16-4ba1-bc6e-afe96f544a31/cover.png	4	t	2026-05-13 13:01:40.629495+00	2026-05-15 06:46:50.028492+00
bf775c28-42fe-4d7b-a35c-b78a0e451932	PANT	pant		\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/categories/bf775c28-42fe-4d7b-a35c-b78a0e451932/cover.png	5	t	2026-05-13 13:09:56.336459+00	2026-05-15 06:47:00.858809+00
\.


--
-- Data for Name: products; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.products (id, name, slug, description, short_description, sku, category_id, brand_id, gender, material, care_instructions, weight, dimensions, base_price, compare_at_price, is_active, is_featured, is_digital, requires_shipping, track_inventory, allow_backorder, min_order_quantity, max_order_quantity, meta_title, meta_description, tags, created_at, updated_at, stock_quantity, low_stock_threshold) FROM stdin;
76136b79-e4ec-4201-961b-c66f3eb4d6a3	Nike Air Force 1 Shoes Triple White	aurevo-air force1-triple white-sneakers	They feature a clean, white-on-white leather upper with a perforated toe box for breathability and a sturdy rubber cupsole.\n•\t1982 (The Debut): Designed by Bruce Kilgore, the silhouette launched exclusively as a high-top sneaker. It was named after the U.S. President's aircraft. This was the first basketball shoe to feature Nike Air technology for impact cushioning. The original marketing campaign featured the "Original Six" NBA players.\n•\t1983 (Introduction of the Low): Nike introduced the popular low-top version to provide more casual lifestyle appeal and greater ankle mobility.\n•\t1984 (The Near Discontinuation): Nike initially planned to discontinue the silhouette. However, massive demand from three Baltimore retailers—who proposed an exclusive "Color of the Month" club—convinced Nike to keep producing the shoe, effectively birth of the modern "retro" sneaker sneaker culture.\n•\t1990s (The "Triple White" Era & Hip-Hop Evolution): The legendary solid all-white ("white-on-white") version debuted. It became heavily embedded in East Coast hip-hop fashion, earning the nickname "Uptowns" due to its ubiquity in Harlem, New York.\n•\t2000s–Present (Global Pop Culture Icon): The shoe's cultural relevance exploded globally, bolstered by musical tributes like rapper Nelly’s 2002 hit song “Air Force Ones”. It remains Nike's best-selling sneaker of all time, having generated thousands of color variations and high-profile collaborations with luxury houses and artists.\n	Clean triple white sneakers for casual and streetwear fashion.	NK-AF1-W	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	men			\N	\N	2450.00	3090.00	t	f	f	t	t	f	1	\N			{#SneakersBD,#womenSneakers,#Sneaker}	2026-05-14 12:39:16.492397+00	2026-05-24 13:45:03.865549+00	28	10
bce88844-5ee7-4cbd-b5df-558c5ada052c	Nike x Louis Vuitton Air Force 1 Low "White/Blue"	nike-x-louis-vuitton-air-force-1-low-white-blue	The Louis Vuitton x Nike Air Force 1 Low features white premium leather paneled with blue Monogram denim overlay textiles. Crafted by hand in Fiesso d'Artico, Italy, this sneaker merges iconic streetwear aesthetics with high-fashion luxury craftsmanship.	The Nike x Louis Vuitton Air Force 1 Low "White/Blue" Mini Swoosh is now available at AUREVO FASHION!	NK-AF1-LV	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	men			\N	\N	2490.00	3190.00	t	f	f	t	t	f	1	\N			{"Louis Vuitton",Sneakers,Nike}	2026-05-14 15:31:33.924355+00	2026-05-24 13:43:49.352858+00	28	10
0e642c4c-b19f-442c-9948-610274292a0b	Nike Air Force 1 Low White Light Armory Blue Mini Swoosh	nike-air-force-1-low-white-light-armory-blue-mini-swoosh	The Nike Air Force 1 Low White Light Armory Blue Mini Swoosh (Women's) is now available at AUREVO FASHION!	The Nike Air Force 1 Low White Light Armory Blue Mini Swoosh (Women's) is now available at AUREVO FASHION!	NK-AF1-SKY-B	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	women			\N	\N	2450.00	3090.00	t	f	f	t	t	f	1	\N			{women,sneakers,"air force1"}	2026-05-14 13:45:35.85979+00	2026-05-24 13:44:38.345888+00	28	10
c30c27d9-1271-4b72-8ac5-2553e188b581	Nike Vomero 18  running Shoes 1.1	nike-vomero-18	The Nike Vomero 18 is a premium, maximum-cushion road running shoe engineered to deliver a highly cushioned, stable, and responsive ride. It is optimized for daily training, recovery days, and long-distance runs like marathons. \n	The Nike Vomero 18 Running shoe is now available at AUREVO FASHION!	NK-VO-18-OR	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	unisex			\N	\N	2550.00	3390.00	t	f	f	t	t	f	1	\N			{"Nike Vomero 18",Running,Sneakers}	2026-05-15 11:24:37.06546+00	2026-05-24 13:45:24.412963+00	28	10
6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	Air Jordan 1 Retro Low OG 'Black Toe'	air-jordan-1-retro-low-og-black-toe	The honors the iconic original colorway debuted by Nike back in 1985.\nColor Palette: White, Black, and Varsity Red.\nUpper Material: Premium genuine leather construction provides structured durability.\nColor Blocking: Classic white leather base layer flanked by stark black leather forefoot overlays (creating the "Black Toe" identity).\nAccents: Vibrant Varsity Red highlights across the clean heel counter and ankle collar panels.\nBranding: Stamped black Jordan Wings logo resting on the red heel tab, paired with retro Nike Air typography stitched onto the woven tongue tag.\nSole Unit: Durable rubber cupsole embedded with protective Air-cushioned technology, sitting on a classic red high-traction outsole	The Nike Air Jordan 1 Retro Low OG 'Black Toe' Mini Swoosh is now available at AUREVO FASHION!	NK-AJ-RBW	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	men			\N	\N	2450.00	3090.00	t	f	f	t	t	f	1	\N			{"Air Jordan 1 Retro Low OG 'Black Toe'",sneakers,"red color"}	2026-05-14 16:30:10.283653+00	2026-05-24 13:40:55.984065+00	28	10
423b16da-2ed6-4ee2-843f-3ccf0884b691	Nike Vomero 18 Running Shoes1.1	nike-vomero-18-running-shoes1-1	The Nike Vomero 18 is a premium, maximum-cushion road running shoe engineered to deliver a highly cushioned, stable, and responsive ride. It is optimized for daily training, recovery days, and long-distance runs like marathons. \n•\tDual-Layer Midsole: Features a premium foam stack with responsive ZoomX foam on top for maximum energy return and a bottom layer of ReactX foam for a bouncy, long-lasting ride.\n•\tMax Cushioning: Built with a substantial 46mm heel stack height, making it the most cushioned version in the Vomero line to reduce joint impact.\n•\tBreathable Upper: Constructed with an engineered, breathable mesh upper designed to regulate temperature and maintain consistent airflow.\n•\tPlush Comfort: Includes a thick, throwback-style padded tongue and a relaxed heel construction for a secure yet accommodating fit.\n•\tSmooth Transitions: Redesigned rubber outsole traction pattern optimized for a smooth, fluid heel-to-toe transition. 	The Nike Vomero 18 Running shoe is now available at AUREVO FASHION!	NK-VO-18-YW	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	unisex			\N	\N	2550.00	3390.00	t	f	f	t	t	f	1	\N			{"Nike Vomero 18","Running Shoes1.1",Sneakers}	2026-05-15 11:54:37.803228+00	2026-05-24 13:45:28.994013+00	28	10
67db6747-0666-40bd-b393-aa6f2e7ecc83	Nike Air Force 1 a White and Navy Blue {shoe1:1}	nike-air-force-1-a-white-and-navy-blue-{shoe1:1}	These are custom-designed Nike Air Force 1 low-top sneakers in a white and navy blue colorway featuring collaborative branding from The North Face. \n•\tThe shoe features a textured white upper contrasted by a navy blue mid-panel and outsole.\n•\tIt showcases a dual-branding aesthetic with "The North Face" logo on the heel and a classic Nike Swoosh.\n•\tAdditional details include custom stitched elements near the toe box and a "The North Face" tag. 	The Nike Air Force 1 shoe is now available at AUREVO FASHION!	NK-AF1-WNB1:1	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	men			\N	\N	4890.00	6090.00	t	t	f	t	t	f	1	\N			{"Air Force1","Low Nik",Sneakers,shoe}	2026-05-15 17:50:22.85695+00	2026-05-24 13:42:41.399974+00	35	10
dbf791e4-4908-4517-9066-1de5d2ed6cf7	Nike Air Force 1 '07 LV8 in the "Off Noir Snakeskin" {Shoe1:1}	nike-air-force-1-07-lv8-in-the-off-noir-snakeskin-shoe1-1	The Nike Air Force 1 '07 LV8 "Off Noir Snakeskin" is a premium, exotic take on the classic silhouette released in early 2025 to celebrate the Lunar Year of the Snake.\nDesign & Materials\nUpper: Constructed with a smooth full-grain leather base in deep black/off-noir.\nOverlays: Features a grey-toned faux-snakeskin pattern embossed across the mudguard, lace collar, and heel tab.\nSwoosh: Rendered in a dark, charcoal-colored suede that complements the muted aesthetic.\nSole Unit: Built with a textured grey polyurethane midsole housing an encapsulated Air-Sole cushioning unit for comfort, paired with a black rubber outsole for traction.	The Nike Air Force 1 '07 LV8 in the "Off Noir Snakeskin" shoe is now available at AUREVO FASHION!	NK-AF1-SNK-1:1	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	men			\N	\N	4890.00	6090.00	t	t	f	t	t	f	1	\N			{"Nike Air Force 1",Sneaker,"New shoe"}	2026-05-15 18:35:28.701802+00	2026-05-24 13:42:10.10378+00	35	10
bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	Louis Vuitton x Nike Air Force 1 Low "Monogram Brown Damier Azur" {Shoe1:1}	louis-vuitton-x-nike-air-force-1-low-monogram-brown-damier-azur	The Louis Vuitton x Nike Air Force 1 Low "Monogram Brown Damier Azur" is a historic luxury sneaker designed by the late visionary Handcrafted in Italy rather than a standard Nike factory, this ultra-rare edition debuted through an exclusive\nKey Features\n•\tMaterial & Canvas: Crafted out of genuine calf leather paneling featuring a patchwork of two signature Louis Vuitton motifs.\n•\tDual Prints: Features a rich Monogram Brown base paired with a light blue and white checkerboard Damier Azur pattern on the toe box, heel tab, and Swoosh.\n•\tIndustrial Accents: Adorned with Abloh's signature Helvetica quotation marks, reading "AIR" printed boldly on the lateral side of the midsole.\n•\tLuxury Hardware: Re-engineered with classic Louis Vuitton hardware profiles and natural cowhide trimmings.\n	The Louis Vuitton x Nike Air Force 1 Low shoe is now available at AUREVO FASHION!	NK-AF1-LV-1:1	32bc639e-153f-46bc-83bd-a86b6d0d8e58	a55b6fce-fbf8-4121-9825-feb898bd1f24	men			\N	\N	4890.00	6090.00	t	t	f	t	t	f	1	\N			{"Louis Vuitton","Nike Air Force 1 Low",Sneakers}	2026-05-15 19:27:57.399895+00	2026-05-24 13:41:38.609662+00	35	10
\.


--
-- Data for Name: product_variants; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_variants (id, product_id, sku, name, size, color, color_code, material, weight, price, compare_at_price, barcode, is_active, sort_order, created_at, updated_at) FROM stdin;
9288d2aa-7fc3-4017-aaee-84bc9a00632a	76136b79-e4ec-4201-961b-c66f3eb4d6a3	NK-AF1-W-WHITE-41	White / 41	41	White	#ffffff	\N	\N	\N	\N	\N	t	0	2026-05-14 12:47:18.166048+00	2026-05-14 12:47:18.166048+00
d18e0ec5-630a-46d5-865e-ff3ea1fe4611	76136b79-e4ec-4201-961b-c66f3eb4d6a3	NK-AF1-W-WHITE-42	White / 42	42	White	#ffffff	\N	\N	\N	\N	\N	t	1	2026-05-14 12:47:18.166048+00	2026-05-14 12:47:18.166048+00
935ac20a-dd8d-42da-a38e-f073c229a049	76136b79-e4ec-4201-961b-c66f3eb4d6a3	NK-AF1-W-WHITE-43	White / 43	43	White	#ffffff	\N	\N	\N	\N	\N	t	2	2026-05-14 12:47:18.166048+00	2026-05-14 12:47:18.166048+00
8045aaf1-a860-4319-a7b2-eab06800aba0	76136b79-e4ec-4201-961b-c66f3eb4d6a3	NK-AF1-W-WHITE-44	White / 44	44	White	#ffffff	\N	\N	\N	\N	\N	t	3	2026-05-14 12:47:18.166048+00	2026-05-14 12:47:18.166048+00
f2d6afec-7f04-4f41-8209-c12d27f7475a	0e642c4c-b19f-442c-9948-610274292a0b	NK-AF1-SKY-B-WHITE-LIGHT--41	White Light Armory Blue / 41	41	White Light Armory Blue	#9BB7D4	\N	\N	\N	\N	\N	t	0	2026-05-14 13:52:21.461072+00	2026-05-14 13:52:21.461072+00
eed82be2-1c2c-4695-be9b-66636d937e96	0e642c4c-b19f-442c-9948-610274292a0b	NK-AF1-SKY-B-WHITE-LIGHT--42	White Light Armory Blue / 42	42	White Light Armory Blue	#9BB7D4	\N	\N	\N	\N	\N	t	1	2026-05-14 13:52:21.461072+00	2026-05-14 13:52:21.461072+00
36d19d02-8452-49e1-b227-68ecb39284ea	0e642c4c-b19f-442c-9948-610274292a0b	NK-AF1-SKY-B-WHITE-LIGHT--43	White Light Armory Blue / 43	43	White Light Armory Blue	#9BB7D4	\N	\N	\N	\N	\N	t	2	2026-05-14 13:52:21.461072+00	2026-05-14 13:52:21.461072+00
5d9c88f0-0acd-429c-93d2-48b1516dec4a	0e642c4c-b19f-442c-9948-610274292a0b	NK-AF1-SKY-B-WHITE-LIGHT--44	White Light Armory Blue / 44	44	White Light Armory Blue	#9BB7D4	\N	\N	\N	\N	\N	t	3	2026-05-14 13:52:21.461072+00	2026-05-14 13:52:21.461072+00
861bee81-2caa-4a76-9b9a-a6ed2ab3963c	bce88844-5ee7-4cbd-b5df-558c5ada052c	NK-AF1-LV-WHITE-BLUE-41	"White/Blue" / 41	41	"White/Blue"	#00334F	\N	\N	\N	\N	\N	t	0	2026-05-14 15:39:00.985635+00	2026-05-14 15:39:00.985635+00
890cf51f-7219-4834-a050-5f57e54a2b9e	bce88844-5ee7-4cbd-b5df-558c5ada052c	NK-AF1-LV-WHITE-BLUE-42	"White/Blue" / 42	42	"White/Blue"	#00334F	\N	\N	\N	\N	\N	t	1	2026-05-14 15:39:00.985635+00	2026-05-14 15:39:00.985635+00
9b45859c-944b-4f35-bab0-b8b09cc36a93	bce88844-5ee7-4cbd-b5df-558c5ada052c	NK-AF1-LV-WHITE-BLUE-43	"White/Blue" / 43	43	"White/Blue"	#00334F	\N	\N	\N	\N	\N	t	2	2026-05-14 15:39:00.985635+00	2026-05-14 15:39:00.985635+00
06b1d5ac-2879-4193-89bb-75b7ead84311	bce88844-5ee7-4cbd-b5df-558c5ada052c	NK-AF1-LV-WHITE-BLUE-44	"White/Blue" / 44	44	"White/Blue"	#00334F	\N	\N	\N	\N	\N	t	3	2026-05-14 15:39:00.985635+00	2026-05-14 15:39:00.985635+00
70964a96-2967-452e-a46b-aa36c7d47910	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	NK-AJ1-RMB-WHITE-BLACK--41	White, Black, and Varsity Red / 41	41	White, Black, and Varsity Red	#A12232	\N	\N	\N	\N	\N	t	0	2026-05-14 16:34:42.042118+00	2026-05-14 16:34:42.042118+00
4fb828a3-b53c-4b5f-8358-6269b1a4a957	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	NK-AJ1-RMB-WHITE-BLACK--42	White, Black, and Varsity Red / 42	42	White, Black, and Varsity Red	#A12232	\N	\N	\N	\N	\N	t	1	2026-05-14 16:34:42.042118+00	2026-05-14 16:34:42.042118+00
6f1e490b-ef44-4c85-8658-8faa0793112f	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	NK-AJ1-RMB-WHITE-BLACK--43	White, Black, and Varsity Red / 43	43	White, Black, and Varsity Red	#A12232	\N	\N	\N	\N	\N	t	2	2026-05-14 16:34:42.042118+00	2026-05-14 16:34:42.042118+00
5dab6981-2d3d-4132-a42f-9d1e0be5cede	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	NK-AJ1-RMB-WHITE-BLACK--44	White, Black, and Varsity Red / 44	44	White, Black, and Varsity Red	#A12232	\N	\N	\N	\N	\N	t	3	2026-05-14 16:34:42.042118+00	2026-05-14 16:34:42.042118+00
a6ac454e-f51f-4d86-a161-0a6c986f4d92	c30c27d9-1271-4b72-8ac5-2553e188b581	NK-VO-18-RD-RED-ORANGE-41	Red,Orange / 41	41	Red,Orange	#FFB300	\N	\N	\N	\N	\N	t	0	2026-05-15 11:32:05.702566+00	2026-05-15 11:32:05.702566+00
fd479cf1-1f41-434a-94d4-778c62844284	c30c27d9-1271-4b72-8ac5-2553e188b581	NK-VO-18-RD-RED-ORANGE-42	Red,Orange / 42	42	Red,Orange	#FFB300	\N	\N	\N	\N	\N	t	1	2026-05-15 11:32:05.702566+00	2026-05-15 11:32:05.702566+00
b51bc07d-aa9c-4837-918f-b4807ce0e8e4	c30c27d9-1271-4b72-8ac5-2553e188b581	NK-VO-18-RD-RED-ORANGE-43	Red,Orange / 43	43	Red,Orange	#FFB300	\N	\N	\N	\N	\N	t	2	2026-05-15 11:32:05.702566+00	2026-05-15 11:32:05.702566+00
6e6b5916-0563-4e7c-9e1b-c2dbadeaf6e1	c30c27d9-1271-4b72-8ac5-2553e188b581	NK-VO-18-RD-RED-ORANGE-44	Red,Orange / 44	44	Red,Orange	#FFB300	\N	\N	\N	\N	\N	t	3	2026-05-15 11:32:05.702566+00	2026-05-15 11:32:05.702566+00
c892d011-a18f-4723-95d2-bec10c4140a9	423b16da-2ed6-4ee2-843f-3ccf0884b691	NK-VO-18-YW-F4F4F2-41	#F4F4F2 / 41	41	#F4F4F2	#F4F4F2	\N	\N	\N	\N	\N	t	0	2026-05-15 12:00:30.789852+00	2026-05-15 12:00:30.789852+00
b442394a-4185-4c30-b1c9-5cba6d97a0f6	423b16da-2ed6-4ee2-843f-3ccf0884b691	NK-VO-18-YW-F4F4F2-42	#F4F4F2 / 42	42	#F4F4F2	#F4F4F2	\N	\N	\N	\N	\N	t	1	2026-05-15 12:00:30.789852+00	2026-05-15 12:00:30.789852+00
7ca259d9-fa37-4bc1-9956-e7593539f6de	423b16da-2ed6-4ee2-843f-3ccf0884b691	NK-VO-18-YW-F4F4F2-43	#F4F4F2 / 43	43	#F4F4F2	#F4F4F2	\N	\N	\N	\N	\N	t	2	2026-05-15 12:00:30.789852+00	2026-05-15 12:00:30.789852+00
97e97e92-bfc3-4ccc-8362-dcedaa2830c0	423b16da-2ed6-4ee2-843f-3ccf0884b691	NK-VO-18-YW-F4F4F2-44	#F4F4F2 / 44	44	#F4F4F2	#F4F4F2	\N	\N	\N	\N	\N	t	3	2026-05-15 12:00:30.789852+00	2026-05-15 12:00:30.789852+00
c4cd8aa5-1b65-4a8e-a791-8e48db265310	67db6747-0666-40bd-b393-aa6f2e7ecc83	NK-AF1-WNB-1:1-WHITE-AND-NA-41	white and navy blue / 41	41	white and navy blue	#000080	\N	\N	\N	\N	\N	t	1	2026-05-15 18:10:05.129002+00	2026-05-15 18:10:05.129002+00
04575dff-b7e5-4a92-a7a3-3a20bcd464b5	67db6747-0666-40bd-b393-aa6f2e7ecc83	NK-AF1-WNB-1:1-WHITE-AND-NA-42	white and navy blue / 42	42	white and navy blue	#000080	\N	\N	\N	\N	\N	t	2	2026-05-15 18:10:05.129002+00	2026-05-15 18:10:05.129002+00
96a2dd0f-06dd-4647-917a-b2e2e3a0cd5f	67db6747-0666-40bd-b393-aa6f2e7ecc83	NK-AF1-WNB-1:1-WHITE-AND-NA-43	white and navy blue / 43	43	white and navy blue	#000080	\N	\N	\N	\N	\N	t	3	2026-05-15 18:10:05.129002+00	2026-05-15 18:10:05.129002+00
f88a31b4-3ac0-404a-8616-e2077317707d	67db6747-0666-40bd-b393-aa6f2e7ecc83	NK-AF1-WNB-1:1-WHITE-AND-NA-44	white and navy blue / 44	44	white and navy blue	#000080	\N	\N	\N	\N	\N	t	4	2026-05-15 18:10:05.129002+00	2026-05-15 18:10:05.129002+00
e9364cb4-d955-4c72-82f5-eb98eb96db63	67db6747-0666-40bd-b393-aa6f2e7ecc83	NK-AF1-WNB-1:1-WHITE-AND-NA-40	white and navy blue / 40	40	white and navy blue	#000080	\N	\N	\N	\N	\N	t	0	2026-05-15 18:10:05.129002+00	2026-05-15 18:10:05.129002+00
b3783586-635e-4238-b47d-fc68b536e548	dbf791e4-4908-4517-9066-1de5d2ed6cf7	NK-AF1-SNK-1:1-NOIR-SNAKESK-40	Noir Snakeskin / 40	40	Noir Snakeskin	#2b2018	\N	\N	\N	\N	\N	t	0	2026-05-15 18:40:12.534529+00	2026-05-15 18:40:12.534529+00
967ddced-e77d-4830-90bf-9ee73dd0efa1	dbf791e4-4908-4517-9066-1de5d2ed6cf7	NK-AF1-SNK-1:1-NOIR-SNAKESK-41	Noir Snakeskin / 41	41	Noir Snakeskin	#2b2018	\N	\N	\N	\N	\N	t	1	2026-05-15 18:40:12.534529+00	2026-05-15 18:40:12.534529+00
1d8a99fb-2fd5-405a-869d-eddfb297b2c9	dbf791e4-4908-4517-9066-1de5d2ed6cf7	NK-AF1-SNK-1:1-NOIR-SNAKESK-42	Noir Snakeskin / 42	42	Noir Snakeskin	#2b2018	\N	\N	\N	\N	\N	t	2	2026-05-15 18:40:12.534529+00	2026-05-15 18:40:12.534529+00
ad09d8ad-8259-42fc-b626-37a5a48bfb60	dbf791e4-4908-4517-9066-1de5d2ed6cf7	NK-AF1-SNK-1:1-NOIR-SNAKESK-43	Noir Snakeskin / 43	43	Noir Snakeskin	#2b2018	\N	\N	\N	\N	\N	t	3	2026-05-15 18:40:12.534529+00	2026-05-15 18:40:12.534529+00
19901148-4f34-44ef-8074-8e0c69e44a6a	dbf791e4-4908-4517-9066-1de5d2ed6cf7	NK-AF1-SNK-1:1-NOIR-SNAKESK-44	Noir Snakeskin / 44	44	Noir Snakeskin	#2b2018	\N	\N	\N	\N	\N	t	4	2026-05-15 18:40:12.534529+00	2026-05-15 18:40:12.534529+00
0d7c302d-8baf-4ac4-bcb4-2e36ba851a50	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	NK-AF1-LV-BR-1:1-MONOGRAM-BRO-40	Monogram Brown and Damier Azur / 40	40	Monogram Brown and Damier Azur	#453630	\N	\N	\N	\N	\N	t	0	2026-05-15 19:33:48.175218+00	2026-05-15 19:33:48.175218+00
19fbca31-94c1-4616-9246-12e1596f0e1f	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	NK-AF1-LV-BR-1:1-MONOGRAM-BRO-41	Monogram Brown and Damier Azur / 41	41	Monogram Brown and Damier Azur	#453630	\N	\N	\N	\N	\N	t	1	2026-05-15 19:33:48.175218+00	2026-05-15 19:33:48.175218+00
6190023e-d668-493d-a6aa-d340c67cd21f	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	NK-AF1-LV-BR-1:1-MONOGRAM-BRO-42	Monogram Brown and Damier Azur / 42	42	Monogram Brown and Damier Azur	#453630	\N	\N	\N	\N	\N	t	2	2026-05-15 19:33:48.175218+00	2026-05-15 19:33:48.175218+00
eb895e91-e34c-40c5-9930-be7112cfe4ad	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	NK-AF1-LV-BR-1:1-MONOGRAM-BRO-43	Monogram Brown and Damier Azur / 43	43	Monogram Brown and Damier Azur	#453630	\N	\N	\N	\N	\N	t	3	2026-05-15 19:33:48.175218+00	2026-05-15 19:33:48.175218+00
4285e8df-14ed-40f8-9e61-bbcf8f0c9bcf	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	NK-AF1-LV-BR-1:1-MONOGRAM-BRO-44	Monogram Brown and Damier Azur / 44	44	Monogram Brown and Damier Azur	#453630	\N	\N	\N	\N	\N	t	4	2026-05-15 19:33:48.175218+00	2026-05-15 19:33:48.175218+00
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.profiles (id, first_name, last_name, phone, date_of_birth, gender, avatar_url, preferences, created_at, updated_at) FROM stdin;
2ce470b1-2b5c-4992-9e95-809565b828cc	Nurul	Alam	01840300379	2026-05-04	male	\N	{"role": "admin"}	2025-09-29 10:10:18.580723+00	2026-05-04 17:54:43.406315+00
9c4337df-7bb1-4c01-ba8c-77bcd0bddf4c	\N	\N	\N	\N	\N	\N	{}	2026-05-12 16:11:39.908415+00	2026-05-12 16:11:39.908415+00
e41e486e-78a0-4f59-b64c-f9a52b17e3aa	\N	\N	\N	\N	\N	\N	{}	2026-05-12 16:25:35.884312+00	2026-05-12 16:25:35.884312+00
\.


--
-- Data for Name: cart_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.cart_items (id, user_id, session_id, product_id, variant_id, quantity, price, created_at, updated_at) FROM stdin;
ac62091e-4a4c-4678-be48-df96c4a5d233	e41e486e-78a0-4f59-b64c-f9a52b17e3aa	\N	76136b79-e4ec-4201-961b-c66f3eb4d6a3	9288d2aa-7fc3-4017-aaee-84bc9a00632a	2	0.00	2026-05-14 13:39:57.701586+00	2026-05-14 13:40:24.52443+00
6d42e9b1-0fb4-4ce2-a584-6615f8c80580	\N	guest_mjvomxgq_uscytkr9x9m	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	6190023e-d668-493d-a6aa-d340c67cd21f	1	0.00	2026-05-24 14:55:12.121895+00	2026-05-24 14:55:12.121895+00
f688a285-5487-4410-8707-3cee8cf9e259	\N	guest_mjvomxgq_uscytkr9x9m	67db6747-0666-40bd-b393-aa6f2e7ecc83	c4cd8aa5-1b65-4a8e-a791-8e48db265310	1	0.00	2026-05-25 06:14:41.756477+00	2026-05-25 06:14:41.756477+00
25b74e9b-f109-4586-ba57-963e36a6b693	\N	guest_mjvohj0x_42pdj8jcsn5	c30c27d9-1271-4b72-8ac5-2553e188b581	a6ac454e-f51f-4d86-a161-0a6c986f4d92	1	0.00	2026-05-26 07:21:14.194861+00	2026-05-26 07:21:14.194861+00
148f84f8-e14a-4aa7-a2cc-a1d5cababab2	\N	guest_mjvomxgq_uscytkr9x9m	67db6747-0666-40bd-b393-aa6f2e7ecc83	e9364cb4-d955-4c72-82f5-eb98eb96db63	1	0.00	2026-05-26 13:13:54.759147+00	2026-05-26 13:13:54.759147+00
\.


--
-- Data for Name: inventory; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory (id, variant_id, location, quantity, reserved_quantity, reorder_point, reorder_quantity, last_counted_at, created_at, updated_at) FROM stdin;
a90fab30-8def-4258-a8f1-7cf325b890e6	6e6b5916-0563-4e7c-9e1b-c2dbadeaf6e1	main	7	0	0	0	\N	2026-05-15 11:32:05.829744+00	2026-05-24 13:45:24.412963+00
4b794fc2-4908-46ba-ad9c-b8f2d851ad6f	97e97e92-bfc3-4ccc-8362-dcedaa2830c0	main	7	0	0	0	\N	2026-05-15 12:00:30.902509+00	2026-05-24 13:45:28.994013+00
145631cc-0182-4b27-abfb-2f2f71bb1a38	70964a96-2967-452e-a46b-aa36c7d47910	main	7	0	0	0	\N	2026-05-14 16:34:42.190585+00	2026-05-24 13:40:36.489022+00
b84013a9-7e52-449e-8568-2434e3d4e474	4fb828a3-b53c-4b5f-8358-6269b1a4a957	main	7	0	0	0	\N	2026-05-14 16:34:42.190585+00	2026-05-24 13:40:45.343026+00
f0129e12-71be-4f4c-9cfb-419efc5b7749	6f1e490b-ef44-4c85-8658-8faa0793112f	main	7	0	0	0	\N	2026-05-14 16:34:42.190585+00	2026-05-24 13:40:50.766081+00
880f2ebc-5113-4009-ab2d-9355177dde4a	5dab6981-2d3d-4132-a42f-9d1e0be5cede	main	7	0	0	0	\N	2026-05-14 16:34:42.190585+00	2026-05-24 13:40:55.984065+00
3c994d4c-2b18-4656-8274-3945822bedba	0d7c302d-8baf-4ac4-bcb4-2e36ba851a50	main	7	0	0	0	\N	2026-05-15 19:33:48.430596+00	2026-05-24 13:41:03.623954+00
68450fd1-e9a8-49b6-ad48-3098c54bbcca	19fbca31-94c1-4616-9246-12e1596f0e1f	main	7	0	0	0	\N	2026-05-15 19:33:48.430596+00	2026-05-24 13:41:08.271461+00
1e1723f5-2e5d-4cfb-9dad-f2bf9e3a151a	6190023e-d668-493d-a6aa-d340c67cd21f	main	7	0	0	0	\N	2026-05-15 19:33:48.430596+00	2026-05-24 13:41:13.668317+00
f3da110e-8cc6-403b-8f47-ce2e4835185b	eb895e91-e34c-40c5-9930-be7112cfe4ad	main	7	0	0	0	\N	2026-05-15 19:33:48.430596+00	2026-05-24 13:41:32.563037+00
b3c4c3f1-6bf6-4dce-a1eb-0b07657a478e	4285e8df-14ed-40f8-9e61-bbcf8f0c9bcf	main	7	0	0	0	\N	2026-05-15 19:33:48.430596+00	2026-05-24 13:41:38.609662+00
945b21b2-27db-42a9-b773-378cba37a118	b3783586-635e-4238-b47d-fc68b536e548	main	7	0	0	0	\N	2026-05-15 18:40:12.665123+00	2026-05-24 13:41:45.9735+00
7c44075c-246d-4aae-acf3-fe3ff87a33aa	967ddced-e77d-4830-90bf-9ee73dd0efa1	main	7	0	0	0	\N	2026-05-15 18:40:12.665123+00	2026-05-24 13:41:52.298024+00
e9b87fb9-324c-4d6c-b799-21fb003b1340	1d8a99fb-2fd5-405a-869d-eddfb297b2c9	main	7	0	0	0	\N	2026-05-15 18:40:12.665123+00	2026-05-24 13:41:57.483542+00
80ab547b-886a-4008-adf3-8176b6212f3d	ad09d8ad-8259-42fc-b626-37a5a48bfb60	main	7	0	0	0	\N	2026-05-15 18:40:12.665123+00	2026-05-24 13:42:04.164185+00
5720ccab-83b6-4a15-9cc5-8e31aeeb4355	19901148-4f34-44ef-8074-8e0c69e44a6a	main	7	0	0	0	\N	2026-05-15 18:40:12.665123+00	2026-05-24 13:42:10.10378+00
d9a8c1a3-87e8-4905-b584-84aaf4830fc8	e9364cb4-d955-4c72-82f5-eb98eb96db63	main	7	0	0	0	\N	2026-05-15 18:10:05.208038+00	2026-05-24 13:42:15.720008+00
3e1622a9-74a2-4b5d-8f0d-7ba9d76e11be	c4cd8aa5-1b65-4a8e-a791-8e48db265310	main	7	0	0	0	\N	2026-05-15 18:10:05.208038+00	2026-05-24 13:42:22.834476+00
0b2f3e74-f540-4691-b8c2-b891ec7abb80	04575dff-b7e5-4a92-a7a3-3a20bcd464b5	main	7	0	0	0	\N	2026-05-15 18:10:05.208038+00	2026-05-24 13:42:30.51403+00
d41e5c2c-34c2-409a-ba9f-5cff50b6819f	96a2dd0f-06dd-4647-917a-b2e2e3a0cd5f	main	7	0	0	0	\N	2026-05-15 18:10:05.208038+00	2026-05-24 13:42:35.815087+00
34df138c-47ae-44c6-a9f7-e568f32badd9	f88a31b4-3ac0-404a-8616-e2077317707d	main	7	0	0	0	\N	2026-05-15 18:10:05.208038+00	2026-05-24 13:42:41.399974+00
909b8343-ea38-4685-a19c-aee8bc1b034c	eed82be2-1c2c-4695-be9b-66636d937e96	main	7	0	0	0	\N	2026-05-14 13:52:21.641547+00	2026-05-24 13:42:58.636692+00
21a6b0e9-b075-4e6a-b116-046a66172b3e	36d19d02-8452-49e1-b227-68ecb39284ea	main	7	0	0	0	\N	2026-05-14 13:52:21.641547+00	2026-05-24 13:43:04.418485+00
955791e2-eef5-47fd-b622-75b0fbac1932	f2d6afec-7f04-4f41-8209-c12d27f7475a	main	7	0	0	0	\N	2026-05-14 13:52:21.641547+00	2026-05-24 13:43:10.453927+00
e0209a9e-fcea-4853-bfd8-dc99f6bef237	9288d2aa-7fc3-4017-aaee-84bc9a00632a	main	7	0	0	0	\N	2026-05-14 12:47:18.543378+00	2026-05-24 13:43:16.207077+00
1386ecc8-9f54-4d3c-841b-07d1d71c5ca6	06b1d5ac-2879-4193-89bb-75b7ead84311	main	7	0	0	0	\N	2026-05-14 15:39:01.273962+00	2026-05-24 13:43:33.640994+00
d7113a3a-2ebc-48ae-8921-343d308ee233	9b45859c-944b-4f35-bab0-b8b09cc36a93	main	7	0	0	0	\N	2026-05-14 15:39:01.273962+00	2026-05-24 13:43:39.579616+00
7ae916e7-b985-487a-b5bd-348a036723f9	890cf51f-7219-4834-a050-5f57e54a2b9e	main	7	0	0	0	\N	2026-05-14 15:39:01.273962+00	2026-05-24 13:43:43.678929+00
fe8fe1c2-3b70-485f-a818-713b47c5b7cc	861bee81-2caa-4a76-9b9a-a6ed2ab3963c	main	7	0	0	0	\N	2026-05-14 15:39:01.273962+00	2026-05-24 13:43:49.352858+00
c7d42b2a-1a56-460b-9d2a-3e6035c0bdb3	7ca259d9-fa37-4bc1-9956-e7593539f6de	main	7	0	0	0	\N	2026-05-15 12:00:30.902509+00	2026-05-24 13:44:01.661226+00
e1155079-7e89-4679-8e92-7ea98706f889	b442394a-4185-4c30-b1c9-5cba6d97a0f6	main	7	0	0	0	\N	2026-05-15 12:00:30.902509+00	2026-05-24 13:44:07.277896+00
55d82bbe-487b-472c-a6c8-ce36c829d6b4	a6ac454e-f51f-4d86-a161-0a6c986f4d92	main	7	0	0	0	\N	2026-05-15 11:32:05.829744+00	2026-05-24 13:44:14.481086+00
a0364c06-a95a-48ae-b3cc-c1953f4e6166	b51bc07d-aa9c-4837-918f-b4807ce0e8e4	main	7	0	0	0	\N	2026-05-15 11:32:05.829744+00	2026-05-24 13:44:20.458297+00
7dab5081-015d-4b72-8341-9f4cc6679cc8	fd479cf1-1f41-434a-94d4-778c62844284	main	7	0	0	0	\N	2026-05-15 11:32:05.829744+00	2026-05-24 13:44:29.266888+00
954cb967-d169-4117-939b-85916003474d	5d9c88f0-0acd-429c-93d2-48b1516dec4a	main	7	0	0	0	\N	2026-05-14 13:52:21.641547+00	2026-05-24 13:44:38.345888+00
c236e218-9a51-43ae-87e6-60041a5f16f3	d18e0ec5-630a-46d5-865e-ff3ea1fe4611	main	7	0	0	0	\N	2026-05-14 12:47:18.543378+00	2026-05-24 13:44:47.98132+00
7877c193-3b3b-4ace-aec3-d8a2622d76bf	935ac20a-dd8d-42da-a38e-f073c229a049	main	7	0	0	0	\N	2026-05-14 12:47:18.543378+00	2026-05-24 13:44:55.254159+00
010c8084-f5a5-4415-84e5-e7af659463e9	8045aaf1-a860-4319-a7b2-eab06800aba0	main	7	0	0	0	\N	2026-05-14 12:47:18.543378+00	2026-05-24 13:45:03.865549+00
039f4669-9117-4acd-964a-d0fc3d11a9ec	c892d011-a18f-4723-95d2-bec10c4140a9	main	7	0	0	0	\N	2026-05-15 12:00:30.902509+00	2026-05-24 13:45:18.544381+00
\.


--
-- Data for Name: orders; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.orders (id, order_number, user_id, email, phone, subtotal, tax_amount, shipping_amount, discount_amount, total_amount, status, payment_status, fulfillment_status, shipping_method_id, tracking_number, estimated_delivery_date, billing_address, shipping_address, notes, internal_notes, source, created_at, updated_at, session_id, guest_token, guest_token_expires) FROM stdin;
\.


--
-- Data for Name: order_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.order_items (id, order_id, product_id, variant_id, product_name, variant_name, sku, quantity, unit_price, total_price, created_at) FROM stdin;
\.


--
-- Data for Name: inventory_movements; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.inventory_movements (id, variant_id, movement_type, reason, quantity, previous_quantity, new_quantity, reserved_quantity, location, order_id, order_item_id, user_id, reference_number, notes, cost_per_unit, total_cost, created_at) FROM stdin;
06b9d398-b167-4ac9-b7a2-7a4537995e92	70964a96-2967-452e-a46b-aa36c7d47910	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:40:36.489022+00
041f3622-a2eb-4b25-a9a1-b224790091f1	4fb828a3-b53c-4b5f-8358-6269b1a4a957	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:40:45.343026+00
53c69b6c-706f-4362-97f2-25d25ca9236b	6f1e490b-ef44-4c85-8658-8faa0793112f	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:40:50.766081+00
458e2351-1217-4458-a6d6-5f3604e1d5cd	5dab6981-2d3d-4132-a42f-9d1e0be5cede	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:40:55.984065+00
518ec36c-d72c-4578-8ae7-10f069e13a06	0d7c302d-8baf-4ac4-bcb4-2e36ba851a50	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:03.623954+00
3785107d-14aa-4425-9b96-cf3dde099a91	19fbca31-94c1-4616-9246-12e1596f0e1f	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:08.271461+00
d48feea4-a3b4-41a1-999a-50de0ea08e64	6190023e-d668-493d-a6aa-d340c67cd21f	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:13.668317+00
368ffc89-4e11-4744-ae93-d8fd66c53aa2	eb895e91-e34c-40c5-9930-be7112cfe4ad	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:32.563037+00
3f651fb1-6cac-4d36-9a2d-cb82f4fbc365	4285e8df-14ed-40f8-9e61-bbcf8f0c9bcf	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:38.609662+00
9f071274-e9b5-4e43-9892-fa7d3c69569b	b3783586-635e-4238-b47d-fc68b536e548	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:45.9735+00
a843f5c1-e883-4e86-8075-84abfb445a75	967ddced-e77d-4830-90bf-9ee73dd0efa1	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:52.298024+00
c7577008-e21f-4f35-a5dd-bd99f62eaa0f	1d8a99fb-2fd5-405a-869d-eddfb297b2c9	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:41:57.483542+00
209fc030-9d41-47d1-93e7-9324c29ddeb7	ad09d8ad-8259-42fc-b626-37a5a48bfb60	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:04.164185+00
36f9ce9d-9cf8-486f-9937-317688b30e9f	19901148-4f34-44ef-8074-8e0c69e44a6a	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:10.10378+00
1429bb72-3bc2-4a04-bebe-b3bacb112611	e9364cb4-d955-4c72-82f5-eb98eb96db63	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:15.720008+00
784340b5-0d82-4e88-bd97-d9d29da8952d	c4cd8aa5-1b65-4a8e-a791-8e48db265310	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:22.834476+00
509cce99-f371-4a93-900c-14b8ea344937	04575dff-b7e5-4a92-a7a3-3a20bcd464b5	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:30.51403+00
c0e638e1-11fc-4c7b-ad6f-b45e28755132	96a2dd0f-06dd-4647-917a-b2e2e3a0cd5f	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:35.815087+00
cb65cac5-4164-4d00-a421-9d121059a5d4	f88a31b4-3ac0-404a-8616-e2077317707d	restock	purchase_order	2	5	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:41.399974+00
dee34a31-b842-4fe4-bd1f-a24dea7dcc29	f2d6afec-7f04-4f41-8209-c12d27f7475a	restock	purchase_order	2	2	4	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:48.204382+00
c33b5fdd-d035-4d6b-ac64-d728c1af1caf	eed82be2-1c2c-4695-be9b-66636d937e96	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:42:58.636692+00
4953c2a4-274d-4cde-9bb5-7a133adaf9dd	36d19d02-8452-49e1-b227-68ecb39284ea	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:04.418485+00
f3c4f2c9-405a-4904-a70c-dd5fa33eac5f	f2d6afec-7f04-4f41-8209-c12d27f7475a	restock	purchase_order	3	4	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:10.453927+00
a70ff272-674b-4080-836f-cdd7cda333bc	9288d2aa-7fc3-4017-aaee-84bc9a00632a	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:16.207077+00
c7b01179-0a8e-4408-a2e9-31ce938ef298	06b1d5ac-2879-4193-89bb-75b7ead84311	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:33.640994+00
84b20d78-317c-429c-9d07-3a664da6e1f5	9b45859c-944b-4f35-bab0-b8b09cc36a93	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:39.579616+00
dda49900-04ad-4b4f-ab37-8eef3e3482fc	890cf51f-7219-4834-a050-5f57e54a2b9e	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:43.678929+00
3ecc442c-f35f-4ff0-a786-c650c1676f32	861bee81-2caa-4a76-9b9a-a6ed2ab3963c	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:49.352858+00
fa968a4b-6243-4ec5-a729-f61c9039c54f	97e97e92-bfc3-4ccc-8362-dcedaa2830c0	restock	purchase_order	4	2	6	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:43:55.04874+00
726b9924-c174-4bdd-8866-6b5f0e215a59	7ca259d9-fa37-4bc1-9956-e7593539f6de	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:01.661226+00
281cf025-2c29-45bc-987d-961b370bf1af	b442394a-4185-4c30-b1c9-5cba6d97a0f6	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:07.277896+00
417b4080-6204-4792-b42e-5f8316a323a6	a6ac454e-f51f-4d86-a161-0a6c986f4d92	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:14.481086+00
499ad3ba-2d4d-4185-aa2f-5a4f22e39ccd	b51bc07d-aa9c-4837-918f-b4807ce0e8e4	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:20.458297+00
f816b581-ad58-4214-bfbb-770c09d791e5	fd479cf1-1f41-434a-94d4-778c62844284	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:29.266888+00
b5fc9c55-b7ed-4be8-945f-beb08d13560b	5d9c88f0-0acd-429c-93d2-48b1516dec4a	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:38.345888+00
abc96211-75e4-4222-a3b4-f8c837f88985	d18e0ec5-630a-46d5-865e-ff3ea1fe4611	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:47.98132+00
3bf69dc0-6ce0-4fda-8066-45c505965147	935ac20a-dd8d-42da-a38e-f073c229a049	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:44:55.254159+00
e4af6dff-b651-41f2-9aec-96dd1abe1e59	8045aaf1-a860-4319-a7b2-eab06800aba0	restock	purchase_order	4	3	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:45:03.865549+00
882caf5a-8992-4e6b-aa98-b413a5b3bae8	6e6b5916-0563-4e7c-9e1b-c2dbadeaf6e1	restock	purchase_order	4	2	6	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:45:08.970568+00
e5d32c07-1484-4285-8243-faede8d20177	c892d011-a18f-4723-95d2-bec10c4140a9	restock	purchase_order	5	2	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:45:18.544381+00
1484d2c1-4d69-45b4-9a32-5045eab8044d	6e6b5916-0563-4e7c-9e1b-c2dbadeaf6e1	restock	purchase_order	1	6	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:45:24.412963+00
d1121e2c-e013-4c98-af03-61a118b10f58	97e97e92-bfc3-4ccc-8362-dcedaa2830c0	restock	purchase_order	1	6	7	0	main	\N	\N	\N	\N	\N	\N	0.00	2026-05-24 13:45:28.994013+00
\.


--
-- Data for Name: meta_capi_sent; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.meta_capi_sent (order_id, sent_at) FROM stdin;
\.


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.payments (id, order_id, payment_method, payment_intent_id, amount, currency, status, gateway_response, processed_at, created_at) FROM stdin;
\.


--
-- Data for Name: product_images; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_images (id, product_id, variant_id, url, alt_text, sort_order, is_primary, created_at) FROM stdin;
e28f89f8-b8d4-4cb4-938e-8dd2cf14333f	0e642c4c-b19f-442c-9948-610274292a0b	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/0e642c4c-b19f-442c-9948-610274292a0b/1778766746421-0-b-side.webp		4	f	2026-05-14 13:53:06.242074+00
845f93b9-667d-474f-af9f-4c79a8bfc55d	76136b79-e4ec-4201-961b-c66f3eb4d6a3	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/76136b79-e4ec-4201-961b-c66f3eb4d6a3/1778763218286-2-r-side.webp		1	t	2026-05-14 12:54:18.371527+00
f688d6c5-787c-4eeb-b523-86100114820e	76136b79-e4ec-4201-961b-c66f3eb4d6a3	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/76136b79-e4ec-4201-961b-c66f3eb4d6a3/1778763218286-3-u-side.webp		2	f	2026-05-14 12:54:18.321077+00
a3dffc70-8ecd-4fef-bf49-3fcc01eaf597	76136b79-e4ec-4201-961b-c66f3eb4d6a3	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/76136b79-e4ec-4201-961b-c66f3eb4d6a3/1778763218285-0-b-side.webp		4	f	2026-05-14 12:54:18.298877+00
b24827dd-689e-4d28-a499-fa594edb9596	76136b79-e4ec-4201-961b-c66f3eb4d6a3	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/76136b79-e4ec-4201-961b-c66f3eb4d6a3/1778763218286-1-p-side.webp		3	f	2026-05-14 12:54:18.348985+00
639401a4-7968-4184-be0a-3aab211b8c41	0e642c4c-b19f-442c-9948-610274292a0b	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/0e642c4c-b19f-442c-9948-610274292a0b/1778766746422-2-r-sidw.webp		1	f	2026-05-14 13:53:06.251381+00
f097b621-7d13-4003-b217-d3b6c1d61f1a	0e642c4c-b19f-442c-9948-610274292a0b	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/0e642c4c-b19f-442c-9948-610274292a0b/1778766746422-1-p-side.webp		2	f	2026-05-14 13:53:06.220797+00
10caad51-fbf2-4dbb-9ba6-9ca651c823f6	0e642c4c-b19f-442c-9948-610274292a0b	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/0e642c4c-b19f-442c-9948-610274292a0b/1778766746422-3-u-side1.webp		3	f	2026-05-14 13:53:06.464594+00
2f53d6e6-5cef-4500-b129-a5d1aa5b3401	bce88844-5ee7-4cbd-b5df-558c5ada052c	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bce88844-5ee7-4cbd-b5df-558c5ada052c/1778773145281-4-u-side.webp		3	f	2026-05-14 15:39:45.29787+00
3b656a48-972f-4308-a1d2-4b65aa2880bc	bce88844-5ee7-4cbd-b5df-558c5ada052c	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bce88844-5ee7-4cbd-b5df-558c5ada052c/1778773144591-2-p-side.webp		4	f	2026-05-14 15:39:44.718206+00
255349b3-8c28-4dc0-b5a5-3a2a3368679f	bce88844-5ee7-4cbd-b5df-558c5ada052c	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bce88844-5ee7-4cbd-b5df-558c5ada052c/1778773144590-0-b-side.webp		5	f	2026-05-14 15:39:45.131664+00
41f22953-5ed1-427a-83fb-392c7ebc25ea	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f/1778776806294-2-img-20260504-223855.avif	\N	2	f	2026-05-14 16:40:46.419847+00
46be2675-5c1e-4a89-8f27-04fbff5222ca	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f/1778776806294-3-img-20260504-224122.avif		4	f	2026-05-14 16:40:46.430382+00
73533ab2-185e-4032-990e-e0bfe8d7e7c3	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f/1778776807049-4-img-20260504-224804.avif		3	f	2026-05-14 16:40:46.95808+00
45f2fc2a-1bf9-4aab-8c90-07d6d57fd6f7	c30c27d9-1271-4b72-8ac5-2553e188b581	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/c30c27d9-1271-4b72-8ac5-2553e188b581/1778844866781-2-r-side.jpg		0	f	2026-05-15 11:35:09.113256+00
fd454a63-3365-43e9-9f22-1b2d5501bb06	c30c27d9-1271-4b72-8ac5-2553e188b581	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/c30c27d9-1271-4b72-8ac5-2553e188b581/1778844866777-0-b-side.jpg		2	f	2026-05-15 11:35:09.108591+00
64675579-2825-4e1d-9b1f-8f77920269e4	c30c27d9-1271-4b72-8ac5-2553e188b581	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/c30c27d9-1271-4b72-8ac5-2553e188b581/1778844866781-3-u-side.jpg		1	f	2026-05-15 11:35:09.251458+00
67426adc-7b1e-4b57-9d8e-c35a08baf400	c30c27d9-1271-4b72-8ac5-2553e188b581	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/c30c27d9-1271-4b72-8ac5-2553e188b581/1778844866781-1-p-side.jpg		3	f	2026-05-15 11:35:09.346155+00
5c8078a5-0a43-4fdf-b8ec-84b723d2cebf	67db6747-0666-40bd-b393-aa6f2e7ecc83	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/67db6747-0666-40bd-b393-aa6f2e7ecc83/1778867694586-2-r-side.jpg		1	f	2026-05-15 17:55:38.98844+00
4f94def2-900a-478c-9f96-76db14e1d147	67db6747-0666-40bd-b393-aa6f2e7ecc83	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/67db6747-0666-40bd-b393-aa6f2e7ecc83/1778867694586-1-p-side.jpg		2	f	2026-05-15 17:55:38.899916+00
dcbefb5b-3ea0-49ab-8ab8-573667424981	423b16da-2ed6-4ee2-843f-3ccf0884b691	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/423b16da-2ed6-4ee2-843f-3ccf0884b691/1778846438333-1-p-side.jpg		2	f	2026-05-15 12:01:20.785284+00
4312bffe-c205-4ba9-ae7b-79833326ace2	423b16da-2ed6-4ee2-843f-3ccf0884b691	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/423b16da-2ed6-4ee2-843f-3ccf0884b691/1778846438331-0-b-side.jpg		3	f	2026-05-15 12:01:20.593268+00
4c15130c-8c69-4c4e-9b7f-f8a4dd23a071	bce88844-5ee7-4cbd-b5df-558c5ada052c	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bce88844-5ee7-4cbd-b5df-558c5ada052c/1778847035369-0-box.jpg	\N	0	f	2026-05-15 12:11:18.456291+00
6e61a648-2365-4d8c-8f1f-7557cbff9201	bce88844-5ee7-4cbd-b5df-558c5ada052c	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bce88844-5ee7-4cbd-b5df-558c5ada052c/1778847035370-1-r-side2.jpg	\N	1	f	2026-05-15 12:11:18.85513+00
1450cccf-cdfb-41e8-9be7-f22c24ae9b5c	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f/1778847603978-0-box-show.jpg	\N	0	f	2026-05-15 12:20:45.929732+00
818f2ec4-bed7-46ea-84e1-1c49667953fa	6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/6a4645b0-f9b5-4fd4-82c9-3b02d9d9f42f/1778847695858-0-r-side.jpg		1	f	2026-05-15 12:22:17.777911+00
a6723260-d2c4-41a2-8f72-b50b4a2ecbd0	423b16da-2ed6-4ee2-843f-3ccf0884b691	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/423b16da-2ed6-4ee2-843f-3ccf0884b691/1778847895083-1-u-side.jpg	\N	1	f	2026-05-15 12:25:37.087477+00
e8973a5b-1bda-4085-b6d5-632832c9438c	423b16da-2ed6-4ee2-843f-3ccf0884b691	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/423b16da-2ed6-4ee2-843f-3ccf0884b691/1778847895082-0-r-side.jpg	\N	0	f	2026-05-15 12:25:37.107736+00
f70c1133-e26d-4a0c-901e-442fade55980	67db6747-0666-40bd-b393-aa6f2e7ecc83	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/67db6747-0666-40bd-b393-aa6f2e7ecc83/1778867694586-3-u-side.jpg		3	f	2026-05-15 17:55:39.12487+00
219d7010-fdfd-44b8-aef5-f4672d67b5e1	67db6747-0666-40bd-b393-aa6f2e7ecc83	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/67db6747-0666-40bd-b393-aa6f2e7ecc83/1778867694582-0-b-side.jpg		4	f	2026-05-15 17:55:38.908429+00
4bd4da15-44c7-4f6a-add2-0a8b244f704b	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870723384-3-r-angel-side.webp	\N	3	f	2026-05-15 18:46:07.447363+00
9bd4ebb3-6464-422f-b10a-946b1d7f8722	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870723384-2-p-side.webp		5	f	2026-05-15 18:46:07.290747+00
440a3630-fceb-4a51-bd0a-6b0aedf42c12	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870724244-4-r-side.webp		1	f	2026-05-15 18:46:07.70016+00
c78e5422-b659-4660-b362-ee47fd0bcc19	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870724354-6-u-side.webp		2	f	2026-05-15 18:46:07.826876+00
4e5fa624-ecd0-4348-8cbe-2ae8e539d653	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870723381-0-2b-side.webp		4	f	2026-05-15 18:46:07.446917+00
b03e4ce6-62df-4ba2-a94d-e7ea4d2b8eb0	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870723384-1-b-side.webp		6	f	2026-05-15 18:46:07.447481+00
286dd3db-5066-4ee1-a414-2c9e4bf7a91d	dbf791e4-4908-4517-9066-1de5d2ed6cf7	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/dbf791e4-4908-4517-9066-1de5d2ed6cf7/1778870724353-5-s-l1600-2.webp		7	f	2026-05-15 18:46:07.771664+00
8ed2498c-f392-4aae-8d29-b2706962f26f	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bdc8fa3a-127d-4604-b3cd-1f86041ed9cc/1778873806202-4-u-side.jpg		1	f	2026-05-15 19:36:46.570778+00
3e906d9c-16e3-4b0a-9ca5-92f443166a9b	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bdc8fa3a-127d-4604-b3cd-1f86041ed9cc/1778873805069-3-r-side.jpg		0	t	2026-05-15 19:36:46.190905+00
1eede227-07b4-4e3e-bb09-9174e44c63bb	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bdc8fa3a-127d-4604-b3cd-1f86041ed9cc/1778873805069-2-pu-side.jpg		2	f	2026-05-15 19:36:46.140713+00
84aeb844-ecd7-4a4a-8852-cb9c28bc1513	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bdc8fa3a-127d-4604-b3cd-1f86041ed9cc/1778873805069-1-p-side.jpg		3	f	2026-05-15 19:36:46.132714+00
877e37a1-bdcc-4f1f-967f-0055dea763fc	bdc8fa3a-127d-4604-b3cd-1f86041ed9cc	\N	https://bwcbcmeftplyljgcacvr.supabase.co/storage/v1/object/public/product-images/products/bdc8fa3a-127d-4604-b3cd-1f86041ed9cc/1778873805066-0-b-side.jpg		4	f	2026-05-15 19:36:46.177634+00
\.


--
-- Data for Name: product_reviews; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.product_reviews (id, product_id, user_id, order_id, rating, title, content, is_verified_purchase, is_approved, helpful_count, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.user_addresses (id, user_id, type, is_default, first_name, last_name, company, address_line_1, address_line_2, city, state, postal_code, country, phone, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: wishlist_items; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public.wishlist_items (id, user_id, product_id, variant_id, created_at) FROM stdin;
\.


--
-- PostgreSQL database dump complete
--

\unrestrict VaPpKYQ1KE4auosviGAfxvYHdL5bPLJUO9zRJFR5cAMhYrnd84BISADgCObieil

