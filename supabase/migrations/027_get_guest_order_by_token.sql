-- Guest order confirmation: anon clients cannot SELECT orders under RLS.
-- Validate order id + guest_token via SECURITY DEFINER RPC (matches URL from checkout).

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
    to_jsonb(o.*) || jsonb_build_object(
      'order_items',
      COALESCE(
        (
          SELECT jsonb_agg(
            to_jsonb(oi.*) || jsonb_build_object(
              'product',
              (
                SELECT jsonb_build_object('id', p.id, 'name', p.name, 'slug', p.slug)
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

REVOKE ALL ON FUNCTION public.get_guest_order(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_guest_order(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_guest_order(uuid, text) TO authenticated;

COMMENT ON FUNCTION public.get_guest_order(uuid, text) IS
  'Returns order + line items when guest_token matches (order confirmation page).';
