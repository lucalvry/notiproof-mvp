## Issues being addressed

1. The "Your photo (optional)" upload in the collection form does save to `author_photo_url` / `author_avatar_url`, but those fields are not displayed in the dashboard surfaces the owner uses to review or share testimonials (Proof detail, Moderation, Library), so the photo looks "missing".
2. There is no way for the customer to attach a photo as part of the testimonial itself. For purchase-driven testimonials especially, that photo (the product as the customer received it, the "after" result, etc.) needs to live on `media_url` so it shows in widgets, lightboxes, and drives clicks on the linked CTA.
3. When a testimonial is collected for a purchase proof, we currently capture no product image at all in the webhook flows, so widgets can't fall back to a product image either.

## Fix

### A. Add a true photo testimonial mode (`src/pages/collect/Collect.tsx`)

- Replace the 2-button mode selector (Write / Record video) with **Write**, **Photo**, **Record video**.
- New `mode === "photo"`:
  - File input + preview (JPEG/PNG/WebP/GIF, max 5 MB).
  - Same testimonial textarea acts as caption.
  - On submit: upload via `uploadToBunny` to `testimonials/{token}/photo-...` and send the URL as `media_url` (not `author_photo_url`). The existing `submit-testimonial` edge function already detects non-video URLs and sets `media_type = "image"` — no server change needed.
- Keep the video mode and the avatar field in *About you* unchanged. Reword the avatar field label to "Your headshot (optional)" so it's clearer it is a profile picture, not the testimonial image.

### B. Show the customer-supplied avatar in dashboard surfaces

So previously and newly submitted headshots are visible to owners:

- `src/pages/proof/ProofDetail.tsx`: above the existing `media_url` preview, render the avatar circle (`author_photo_url || author_avatar_url`) next to the author name when present, with a small "Customer photo" label.
- `src/pages/admin/Moderation.tsx`: render the same avatar thumbnail next to the author name (lines ~260–275 area).
- `src/pages/proof/ProofLibrary.tsx`: include the avatar in each row's author cell when present (small change to the row renderer).

The widget already renders `author_photo_url` correctly (`PreviewRender.tsx` — carousel, masonry, lightbox, hero), so no widget changes are needed for the avatar to appear once submitted.

### C. Use the product image as fallback `media_url` for purchase testimonials

So that even if a customer doesn't attach a photo, the published testimonial has a relevant visual that supports the CTA.

1. **Webhook capture** — extend Shopify and WooCommerce webhook handlers to capture the first product image alongside the existing `product_reference`:
   - `supabase/functions/webhook-shopify/index.ts`: when iterating `payload.line_items`, also pull `line_item.image?.src` (or the order's `payload.line_items[0].properties` image fallback). Store the URL in a new column `product_image_url` on `proof_objects`, plus a `product_url` (from `payload.line_items[0].product_id` resolved to the storefront URL when available, otherwise null).
   - `supabase/functions/webhook-woocommerce/index.ts`: pull `line_items[0].image?.src` and `line_items[0].product_url` (or the equivalent `permalink`).
2. **DB migration** — add nullable columns to `proof_objects`:
   - `product_image_url text`
   - `product_url text`
   No RLS changes needed (existing select/insert policies already cover full row access for the owning business).
3. **CTA / media fallback in widgets** — in `src/components/widgets/PreviewRender.tsx` and `supabase/functions/widget-render/index.ts`:
   - When the proof has no `media_url` but has `product_image_url`, render `product_image_url` in the media slot.
   - When the widget supports a CTA and the proof has `product_url`, prefer that as the CTA link target (fallback to the existing widget-level CTA URL).
4. **Owner override** — extend `ProofDetail.tsx`'s edit form with two new optional inputs: "Product image URL" and "Product URL", so an owner can set or correct these manually for proofs that came from non-webhook sources.

### D. Backfill the user's specific testimonial

After deploy, copy the previously submitted photo from `author_photo_url` into `media_url` (with `media_type = 'image'`) for the proof at `/proof/2abcf886-...` so it immediately shows in the testimonial. This is a one-row update, done as part of the same migration.

## Result

- Customers leaving a testimonial can choose **Write / Photo / Record video** as equal options. A submitted photo shows in widgets, lightboxes, and shares.
- Customer headshots (the avatar field) are now visible to owners in Proof detail, Moderation, and Library, not only in widget previews.
- Purchase-based testimonial requests automatically attach the product image and product URL to the proof, so even a text-only testimonial renders with a relevant visual and a working CTA.
- The existing testimonial in question gets its already-uploaded photo promoted to `media_url` so it appears immediately.

