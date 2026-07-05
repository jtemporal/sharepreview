import { fetchPageMeta } from './meta.mjs';
import { isLocalhostUrl } from './url-policy.mjs';
import { fetchImageInfo } from './image-dimensions.mjs';
import { validatePreview } from './validate.mjs';

export async function buildPreviewPayload(sourceUrl) {
  const preview = await fetchPageMeta(sourceUrl);

  if (preview.og.image) {
    if (!isLocalhostUrl(preview.og.image)) {
      preview.warnings.push(
        'og:image must be a localhost URL — external images are not fetched for security.',
      );
    } else {
      preview.image_info = await fetchImageInfo(preview.og.image);
    }
  }

  if (preview.og.image && preview.image_info?.warnings?.length) {
    preview.warnings.push(...preview.image_info.warnings);
  }

  const validation = validatePreview(preview);
  preview.valid = validation.valid;
  preview.missing = validation.missing;

  return preview;
}