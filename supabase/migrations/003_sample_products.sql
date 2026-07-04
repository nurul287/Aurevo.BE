-- Sample Products Data for Footwear E-commerce
-- Migration: 003_sample_products.sql

-- Insert additional categories
INSERT INTO categories (name, slug, description, sort_order) VALUES
('Running Shoes', 'running-shoes', 'Performance running and athletic shoes', 1),
('Basketball', 'basketball', 'High-performance basketball shoes', 2),
('Lifestyle', 'lifestyle', 'Casual lifestyle and streetwear shoes', 3),
('Work Boots', 'work-boots', 'Durable work and safety boots', 4),
('Hiking', 'hiking', 'Outdoor hiking and trail shoes', 5)
ON CONFLICT (slug) DO NOTHING;

-- Insert additional brands
INSERT INTO brands (name, slug, description, website_url) VALUES
('Jordan', 'jordan', 'Air Jordan basketball shoes', 'https://jordan.com'),
('New Balance', 'new-balance', 'Performance and lifestyle footwear', 'https://newbalance.com'),
('Puma', 'puma', 'Forever Faster', 'https://puma.com'),
('Reebok', 'reebok', 'Be More Human', 'https://reebok.com'),
('Under Armour', 'under-armour', 'I Will', 'https://underarmour.com')
ON CONFLICT (slug) DO NOTHING;

-- Get category and brand IDs for reference
DO $$
DECLARE
    sneakers_id UUID;
    boots_id UUID;
    dress_shoes_id UUID;
    running_id UUID;
    lifestyle_id UUID;
    nike_id UUID;
    adidas_id UUID;
    jordan_id UUID;
    timberland_id UUID;
    converse_id UUID;
    vans_id UUID;
    new_balance_id UUID;
    puma_id UUID;
BEGIN
    -- Get category IDs
    SELECT id INTO sneakers_id FROM categories WHERE slug = 'sneakers';
    SELECT id INTO boots_id FROM categories WHERE slug = 'boots';
    SELECT id INTO dress_shoes_id FROM categories WHERE slug = 'dress-shoes';
    SELECT id INTO running_id FROM categories WHERE slug = 'running-shoes';
    SELECT id INTO lifestyle_id FROM categories WHERE slug = 'lifestyle';

    -- Get brand IDs
    SELECT id INTO nike_id FROM brands WHERE slug = 'nike';
    SELECT id INTO adidas_id FROM brands WHERE slug = 'adidas';
    SELECT id INTO jordan_id FROM brands WHERE slug = 'jordan';
    SELECT id INTO timberland_id FROM brands WHERE slug = 'timberland';
    SELECT id INTO converse_id FROM brands WHERE slug = 'converse';
    SELECT id INTO vans_id FROM brands WHERE slug = 'vans';
    SELECT id INTO new_balance_id FROM brands WHERE slug = 'new-balance';
    SELECT id INTO puma_id FROM brands WHERE slug = 'puma';

    -- Insert sample products
    INSERT INTO products (name, slug, description, short_description, sku, category_id, brand_id, gender, material, care_instructions, weight, base_price, compare_at_price, is_active, is_featured, tags) VALUES
    -- Nike Products
    ('Air Force 1 Low', 'air-force-1-low', 'The radiance lives on in the Air Force 1 ''07, the basketball original that puts a fresh spin on what you know best: durably stitched overlays, clean finishes and the perfect amount of flash to make you shine.', 'Classic basketball-inspired sneaker', 'NIKE-AF1-LOW', sneakers_id, nike_id, 'unisex', 'Leather and synthetic', 'Clean with damp cloth', 500, 90.00, 110.00, true, true, ARRAY['classic', 'basketball', 'white']),

    ('Air Max 270', 'air-max-270', 'The Air Max 270 delivers visible cushioning under every step. The design draws inspiration from Air Max icons, showcasing Nike''s greatest innovation with its large window and fresh array of colors.', 'Max Air cushioning for all-day comfort', 'NIKE-AM270', running_id, nike_id, 'unisex', 'Mesh and synthetic', 'Machine wash cold', 350, 150.00, 180.00, true, true, ARRAY['running', 'air-max', 'comfort']),

    ('Dunk Low', 'dunk-low', 'The Nike Dunk Low delivers a classic design that''s perfect for everyday wear. With its timeless silhouette and premium materials, it''s a must-have for any sneaker collection.', 'Classic skateboarding-inspired design', 'NIKE-DUNK-LOW', sneakers_id, nike_id, 'unisex', 'Leather and canvas', 'Spot clean only', 450, 100.00, 120.00, true, false, ARRAY['skateboarding', 'classic', 'retro']),

    -- Adidas Products
    ('Stan Smith', 'stan-smith', 'The Stan Smith is a tennis-inspired classic that''s been reimagined for the streets. With its clean design and premium leather construction, it''s perfect for any occasion.', 'Tennis-inspired classic design', 'ADIDAS-STAN-SMITH', sneakers_id, adidas_id, 'unisex', 'Premium leather', 'Clean with damp cloth', 400, 80.00, 100.00, true, true, ARRAY['tennis', 'classic', 'leather']),

    ('Ultraboost 22', 'ultraboost-22', 'The Ultraboost 22 delivers maximum energy return with every step. Featuring our most responsive Boost midsole and Primeknit+ upper, it''s designed for runners who demand the best.', 'Maximum energy return for runners', 'ADIDAS-UB22', running_id, adidas_id, 'unisex', 'Primeknit+ and Boost', 'Machine wash cold', 300, 180.00, 220.00, true, true, ARRAY['running', 'boost', 'energy-return']),

    ('Gazelle', 'gazelle', 'The Gazelle is a street style icon that''s been reimagined for today. With its suede upper and classic silhouette, it''s perfect for adding a retro touch to any outfit.', 'Street style icon with suede upper', 'ADIDAS-GAZELLE', lifestyle_id, adidas_id, 'unisex', 'Suede and synthetic', 'Brush with suede brush', 350, 85.00, 105.00, true, false, ARRAY['retro', 'suede', 'street-style']),

    -- Jordan Products
    ('Air Jordan 1 Retro High', 'air-jordan-1-retro-high', 'The Air Jordan 1 Retro High OG brings back the classic that started it all. With premium leather construction and the iconic colorway, it''s a must-have for any Jordan collector.', 'The original that started it all', 'JORDAN-AJ1-HIGH', sneakers_id, jordan_id, 'unisex', 'Premium leather', 'Clean with damp cloth', 500, 170.00, 200.00, true, true, ARRAY['jordan', 'basketball', 'retro', 'premium']),

    ('Air Jordan 4 Retro', 'air-jordan-4-retro', 'The Air Jordan 4 Retro delivers the perfect combination of style and performance. With its unique design elements and premium materials, it''s a standout in any collection.', 'Unique design with premium materials', 'JORDAN-AJ4-RETRO', sneakers_id, jordan_id, 'unisex', 'Leather and synthetic', 'Clean with damp cloth', 450, 200.00, 250.00, true, true, ARRAY['jordan', 'basketball', 'retro', 'unique']),

    -- Timberland Products
    ('6-Inch Premium Boot', '6-inch-premium-boot', 'The 6-Inch Premium Boot is built to last with premium leather construction and our signature lug sole. Perfect for work or play, it''s a true classic.', 'Premium leather construction with lug sole', 'TIMBERLAND-6IN-PREM', boots_id, timberland_id, 'unisex', 'Premium leather', 'Clean and condition regularly', 800, 190.00, 230.00, true, true, ARRAY['work-boot', 'leather', 'durable', 'classic']),

    ('White Ledge Mid Ankle', 'white-ledge-mid-ankle', 'The White Ledge Mid Ankle boot delivers outdoor performance with everyday comfort. Built for hiking and outdoor adventures, it''s ready for any terrain.', 'Outdoor performance with everyday comfort', 'TIMBERLAND-WHITE-LEDGE', boots_id, timberland_id, 'unisex', 'Leather and mesh', 'Clean with damp cloth', 600, 120.00, 150.00, true, false, ARRAY['hiking', 'outdoor', 'waterproof', 'comfort']),

    -- Converse Products
    ('Chuck Taylor All Star High', 'chuck-taylor-all-star-high', 'The Chuck Taylor All Star High is the original basketball shoe that became a cultural icon. With its timeless design and canvas construction, it''s perfect for any style.', 'The original basketball shoe that became an icon', 'CONVERSE-CHUCK-HIGH', sneakers_id, converse_id, 'unisex', 'Canvas and rubber', 'Machine wash cold', 400, 65.00, 80.00, true, true, ARRAY['classic', 'canvas', 'iconic', 'basketball']),

    ('Chuck 70 High', 'chuck-70-high', 'The Chuck 70 High delivers premium construction with vintage details. Built with higher quality materials and attention to detail, it''s the Chuck Taylor reimagined.', 'Premium construction with vintage details', 'CONVERSE-CHUCK70-HIGH', sneakers_id, converse_id, 'unisex', 'Premium canvas and rubber', 'Machine wash cold', 450, 85.00, 100.00, true, false, ARRAY['premium', 'vintage', 'canvas', 'quality']),

    -- Vans Products
    ('Old Skool', 'old-skool', 'The Old Skool is the classic skate shoe that started it all. With its iconic side stripe and durable construction, it''s perfect for skating or street style.', 'The classic skate shoe with iconic side stripe', 'VANS-OLD-SKOOL', sneakers_id, vans_id, 'unisex', 'Canvas and suede', 'Spot clean only', 350, 60.00, 75.00, true, true, ARRAY['skateboarding', 'classic', 'side-stripe', 'durable']),

    ('Authentic', 'authentic', 'The Authentic is the original Vans shoe that started the brand. With its simple design and durable construction, it''s perfect for everyday wear.', 'The original Vans shoe with simple design', 'VANS-AUTHENTIC', sneakers_id, vans_id, 'unisex', 'Canvas and rubber', 'Machine wash cold', 300, 50.00, 65.00, true, false, ARRAY['original', 'simple', 'canvas', 'everyday']),

    -- New Balance Products
    ('990v5', '990v5', 'The 990v5 delivers premium comfort and style with its ENCAP midsole and premium materials. Made in the USA, it''s a true American classic.', 'Premium comfort and style made in the USA', 'NB-990V5', lifestyle_id, new_balance_id, 'unisex', 'Premium suede and mesh', 'Clean with damp cloth', 400, 185.00, 220.00, true, true, ARRAY['made-in-usa', 'premium', 'comfort', 'classic']),

    ('327', '327', 'The 327 blends retro running aesthetics with modern comfort. With its unique design and premium materials, it''s perfect for those who appreciate both style and performance.', 'Retro running aesthetics with modern comfort', 'NB-327', lifestyle_id, new_balance_id, 'unisex', 'Suede and mesh', 'Clean with damp cloth', 350, 90.00, 110.00, true, false, ARRAY['retro', 'running', 'modern', 'unique']),

    -- Puma Products
    ('Suede Classic', 'suede-classic', 'The Suede Classic is a street style icon that''s been reimagined for today. With its premium suede upper and classic silhouette, it''s perfect for any outfit.', 'Street style icon with premium suede', 'PUMA-SUEDE-CLASSIC', lifestyle_id, puma_id, 'unisex', 'Premium suede', 'Brush with suede brush', 350, 75.00, 90.00, true, true, ARRAY['suede', 'classic', 'street-style', 'premium']),

    ('RS-X Reinvention', 'rs-x-reinvention', 'The RS-X Reinvention delivers bold design with maximum comfort. With its chunky silhouette and premium materials, it''s perfect for making a statement.', 'Bold design with maximum comfort', 'PUMA-RSX-REINVENTION', lifestyle_id, puma_id, 'unisex', 'Mesh and synthetic', 'Clean with damp cloth', 400, 110.00, 130.00, true, false, ARRAY['bold', 'chunky', 'statement', 'comfort'])
    ON CONFLICT (slug) DO NOTHING;

END $$;

-- Insert product variants (sizes and colors)
DO $$
DECLARE
    product_record RECORD;
    variant_id UUID;
    size_val TEXT;
    color_val TEXT;
    color_code_val TEXT;
    price_val DECIMAL(10,2);
    sku_val TEXT;
    sizes TEXT[] := ARRAY['7', '7.5', '8', '8.5', '9', '9.5', '10', '10.5', '11', '11.5', '12'];
    colors TEXT[][] := ARRAY[
        ARRAY['White', '#FFFFFF'],
        ARRAY['Black', '#000000'],
        ARRAY['Navy', '#000080'],
        ARRAY['Red', '#FF0000'],
        ARRAY['Gray', '#808080'],
        ARRAY['Brown', '#8B4513'],
        ARRAY['Blue', '#0000FF'],
        ARRAY['Green', '#008000']
    ];
BEGIN
    -- Loop through all products
    FOR product_record IN SELECT id, name, base_price FROM products WHERE is_active = true LOOP
        -- Create variants for each product (limit to 3 colors and 5 sizes for sample data)
        FOR i IN 1..3 LOOP
            color_val := colors[i][1];
            color_code_val := colors[i][2];

            -- Adjust price based on product type
            IF product_record.name LIKE '%Jordan%' OR product_record.name LIKE '%Premium%' THEN
                price_val := product_record.base_price + (i * 10);
            ELSE
                price_val := product_record.base_price + (i * 5);
            END IF;

            -- Create variants for different sizes
            FOR j IN 1..5 LOOP
                size_val := sizes[j + 3]; -- Start from size 8

                -- Generate unique SKU using product ID and variant details
                sku_val := 'SKU-' || SUBSTRING(product_record.id::text, 1, 8) || '-' || UPPER(SUBSTRING(color_val, 1, 3)) || '-' || size_val;

                -- Insert variant with conflict handling
                INSERT INTO product_variants (
                    product_id,
                    sku,
                    name,
                    size,
                    color,
                    color_code,
                    price,
                    is_active
                ) VALUES (
                    product_record.id,
                    sku_val,
                    color_val || ' - Size ' || size_val,
                    size_val,
                    color_val,
                    color_code_val,
                    price_val,
                    true
                )
                ON CONFLICT (sku) DO NOTHING
                RETURNING id INTO variant_id;

                -- Only insert inventory if variant was actually created
                IF variant_id IS NOT NULL THEN
                    INSERT INTO inventory (variant_id, quantity, reserved_quantity) VALUES
                    (variant_id, 50 + (j * 10), 0);
                END IF;

            END LOOP;
        END LOOP;
    END LOOP;
END $$;

-- Insert product images
DO $$
DECLARE
    product_record RECORD;
    variant_record RECORD;
    image_urls TEXT[];
    primary_image_url TEXT;
BEGIN
    -- Define image URLs for different product types
    image_urls := ARRAY[
        'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=800',
        'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?w=800',
        'https://images.unsplash.com/photo-1582897085656-c636d006a246?w=800',
        'https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=800',
        'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800',
        'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=800',
        'https://images.unsplash.com/photo-1608667508764-33cf0726a4c4?w=800',
        'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=800'
    ];

    -- Loop through all products
    FOR product_record IN SELECT id, name FROM products WHERE is_active = true LOOP
        -- Select a random image URL for this product
        primary_image_url := image_urls[1 + (random() * (array_length(image_urls, 1) - 1))::int];

        -- Insert primary product image (only if it doesn't exist)
        INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
        SELECT product_record.id, primary_image_url, product_record.name || ' - Main Image', 0, true
        WHERE NOT EXISTS (
            SELECT 1 FROM product_images
            WHERE product_id = product_record.id AND is_primary = true
        );

        -- Insert additional images for the product (only if they don't exist)
        FOR i IN 2..4 LOOP
            INSERT INTO product_images (product_id, url, alt_text, sort_order, is_primary)
            SELECT product_record.id, image_urls[i], product_record.name || ' - Image ' || i, i-1, false
            WHERE NOT EXISTS (
                SELECT 1 FROM product_images
                WHERE product_id = product_record.id AND url = image_urls[i]
            );
        END LOOP;

        -- Insert variant-specific images (one per variant, only if they don't exist)
        FOR variant_record IN SELECT id, color FROM product_variants WHERE product_id = product_record.id AND is_active = true LIMIT 3 LOOP
            INSERT INTO product_images (product_id, variant_id, url, alt_text, sort_order, is_primary)
            SELECT product_record.id, variant_record.id, primary_image_url, product_record.name || ' - ' || variant_record.color, 0, false
            WHERE NOT EXISTS (
                SELECT 1 FROM product_images
                WHERE product_id = product_record.id AND variant_id = variant_record.id
            );
        END LOOP;
    END LOOP;
END $$;

-- Update product base prices to match variant prices (set to minimum variant price)
UPDATE products
SET base_price = (
    SELECT MIN(price)
    FROM product_variants
    WHERE product_id = products.id AND is_active = true
)
WHERE id IN (
    SELECT DISTINCT product_id
    FROM product_variants
    WHERE is_active = true
);

COMMENT ON TABLE products IS 'Sample products inserted for testing and development';
COMMENT ON TABLE product_variants IS 'Product variants with sizes, colors, and pricing';
COMMENT ON TABLE product_images IS 'Product and variant images for display';
COMMENT ON TABLE inventory IS 'Stock levels for each product variant';
