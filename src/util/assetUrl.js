import { getConfig } from '@edx/frontend-platform';

/**
 * Build a complete URL for an asset by combining the LMS base URL with the asset path.
 * Handle path normalization to ensure exactly one slash is between base URL and asset path.
 *
 * @param {string} assetPath - The relative path to the asset.
 * @returns {string} Complete URL to the asset.
 */
export function buildAssetUrl(assetPath) {
  const base = getConfig().LMS_BASE_URL || '';
  return `${base.replace(/\/+$/, '')}/${assetPath.replace(/^\/+/, '')}`;
}

/**
 * Replace static asset references in HTML content with absolute URLs.
 *
 * @param {string} htmlContent - The HTML content to process.
 * @param {string} [courseId] - Optional course ID for asset URLs.
 * @returns {string} Processed HTML with static asset references converted to absolute URLs.
 */
export function replaceStaticAssetReferences(htmlContent, courseId) {
  if (!htmlContent) {
    return '';
  }

  return htmlContent.replace(
    /((?:src|href|data-src|poster)=)(["'])\/static\/([^"']+)\2/gi,
    (match, attrName, quote, fileName) => {
      const lmsBaseUrl = getConfig().LMS_BASE_URL || '';
      let assetUrl;

      if (courseId) {
        const assetCourseId = courseId.replace('course-v1:', 'asset-v1:');
        assetUrl = `${lmsBaseUrl}/${assetCourseId}+type@asset+block@${fileName}`;
      } else {
        assetUrl = `${lmsBaseUrl}/static/${fileName}`;
      }

      return `${attrName}${quote}${assetUrl}${quote}`;
    },
  );
}
