/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module clipboard/utils/normalizeclipboarddata
 */

/**
 * Removes some popular browser quirks out of the clipboard data (HTML).
 * Removes all HTML comments. These are considered an internal thing and it makes little sense if they leak into the editor data.
 *
 * @param data The HTML data to normalize.
 * @returns Normalized HTML.
 * @internal
 */
export function normalizeClipboardData( data: string ): string {
	return data
		.replace( /<span(?: class="Apple-converted-space"|)>(\s+)<\/span>/g, ( fullMatch, spaces ) => {
			// Handle the most popular and problematic case when even a single space becomes an nbsp;.
			// Decode those to normal spaces. Read more in https://github.com/ckeditor/ckeditor5-clipboard/issues/2.
			if ( spaces.length == 1 ) {
				return ' ';
			}

			return spaces;
		} )
		// Remove all HTML comments.
		.replace( /<!--[\s\S]*?-->/g, '' );
}
