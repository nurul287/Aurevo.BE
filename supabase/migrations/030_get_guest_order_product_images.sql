-- Include product images on guest order confirmation line items.

CREATE OR REPLACE FUNCTION public.get_guest_order(
  p_order_id uuid,
  p_guest_token text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF p_order_id IS NULL OR p_guest_token IS NULL OR length(trim(p_guest_token)) = 0 THEN
    RETURN NULL;
  END IF;

  SELECT
    jsonb_build_object(
      'id', o.id,
      'order_number', o.order_number,
      'status', o.status,
      'payment_status', o.payment_status,
      'fulfillment_status', o.fulfillment_status,
      'subtotal', o.subtotal,
      'tax_amount', o.tax_amount,
      'shipping_amount', o.shipping_amount,
      'discount_amount', o.discount_amount,
      'total_amount', o.total_amount,
      'created_at', o.created_at,
      'order_items',
      COALESCE(
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', oi.id,
              'product_id', oi.product_id,
              'variant_id', oi.variant_id,
              'product_name', oi.product_name,
              'variant_name', oi.variant_name,
              'sku', oi.sku,
              'quantity', oi.quantity,
              'unit_price', oi.unit_price,
              'total_price', oi.total_price,
              'product',
              (
                SELECT jsonb_build_object(
                  'id', p.id,
                  'name', p.name,
                  'slug', p.slug,
                  'images',
                  COALESCE(
                    (
                      SELECT jsonb_agg(
                        jsonb_build_object(
                          'id', pi.id,
                          'url', pi.url,
                          'alt_text', pi.alt_text,
                          'is_primary', pi.is_primary,
                          'sort_order', pi.sort_order
                        )
                        ORDER BY pi.is_primary DESC NULLS LAST, pi.sort_order NULLS LAST
                      )
                      FROM public.product_images pi
                      WHERE pi.product_id = p.id
                    ),
                    '[]'::jsonb
                  )
                )
                FROM public.products p
                WHERE p.id = oi.product_id
              ),
              'variant',
              (
                SELECT jsonb_build_object(
                  'id', pv.id,
                  'name', pv.name,
                  'size', pv.size,
                  'color', pv.color
                )
                FROM public.product_variants pv
                WHERE pv.id = oi.variant_id
              )
            )
            ORDER BY oi.created_at
          )
          FROM public.order_items oi
          WHERE oi.order_id = o.id
        ),
        '[]'::jsonb
      )
    )
  INTO result
  FROM public.orders o
  WHERE o.id = p_order_id
    AND o.guest_token = p_guest_token
    AND (o.guest_token_expires IS NULL OR o.guest_token_expires > now());

  RETURN result;
END;
$$;

COMMENT ON FUNCTION public.get_guest_order(uuid, text) IS
  'Returns order confirmation fields + line items with product images when guest_token matches.';
