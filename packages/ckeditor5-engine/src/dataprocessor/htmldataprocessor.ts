/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/dataprocessor/htmldataprocessor
 */

import { BasicHtmlWriter } from './basichtmlwriter.js';
import { ViewDomConverter } from '../view/domconverter.js';

import { type DataProcessor } from './dataprocessor.js';
import { type DataProcessorHtmlWriter } from './htmlwriter.js';
import { type ViewDocument } from '../view/document.js';
import { type ViewDocumentFragment } from '../view/documentfragment.js';
import type { MatcherPattern } from '../view/matcher.js';

/**
 * The HTML data processor class.
 * This data processor implementation uses HTML as input and output data.
 */
export class HtmlDataProcessor implements DataProcessor {
	/**
	 * A DOM parser instance used to parse an HTML string to an HTML document.
	 */
	public domParser: DOMParser;

	/**
	 * A DOM converter used to convert DOM elements to view elements.
	 */
	public domConverter: ViewDomConverter;

	/**
	 * A basic HTML writer instance used to convert DOM elements to an HTML string.
	 */
	public htmlWriter: DataProcessorHtmlWriter;

	public skipComments: boolean = true;

	/**
	 * Creates a new instance of the HTML data processor class.
	 *
	 * @param document The view document instance.
	 */
	constructor( document: ViewDocument ) {
		this.domParser = new DOMParser();
		this.domConverter = new ViewDomConverter( document, { renderingMode: 'data' } );
		this.htmlWriter = new BasicHtmlWriter();
	}

	/**
	 * Converts a provided {@link module:engine/view/documentfragment~ViewDocumentFragment document fragment}
	 * to data format &ndash; in this case to an HTML string.
	 *
	 * @returns HTML string.
	 */
	public toData( viewFragment: ViewDocumentFragment ): string {
		// Convert view DocumentFragment to DOM DocumentFragment.
		const domFragment = this.domConverter.viewToDom( viewFragment );

		// Convert DOM DocumentFragment to HTML output.
		return this.htmlWriter.getHtml( domFragment );
	}

	/**
	 * Converts the provided HTML string to a view tree.
	 *
	 * @param data An HTML string.
	 * @returns A converted view element.
	 */
	public toView( data: string ): ViewDocumentFragment {
		// Convert input HTML data to DOM DocumentFragment.
		const domFragment = this._toDom( data );

		// Convert DOM DocumentFragment to view DocumentFragment.
		return this.domConverter.domToView( domFragment, { skipComments: this.skipComments } ) as ViewDocumentFragment;
	}

	/**
	 * Registers a {@link module:engine/view/matcher~MatcherPattern} for view elements whose content should be treated as raw data
	 * and not processed during the conversion from the DOM to the view elements.
	 *
	 * The raw data can be later accessed by a
	 * {@link module:engine/view/element~ViewElement#getCustomProperty custom property of a view element} called `"$rawContent"`.
	 *
	 * @param pattern Pattern matching all view elements whose content should be treated as raw data.
	 */
	public registerRawContentMatcher( pattern: MatcherPattern ): void {
		this.domConverter.registerRawContentMatcher( pattern );
	}

	/**
	 * If the processor is set to use marked fillers, it will insert `&nbsp;` fillers wrapped in `<span>` elements
	 * (`<span data-cke-filler="true">&nbsp;</span>`) instead of regular `&nbsp;` characters.
	 *
	 * This mode allows for a more precise handling of the block fillers (so they do not leak into the editor content) but
	 * bloats the editor data with additional markup.
	 *
	 * This mode may be required by some features and will be turned on by them automatically.
	 *
	 * @param type Whether to use the default or the marked `&nbsp;` block fillers.
	 */
	public useFillerType( type: 'default' | 'marked' ): void {
		this.domConverter.blockFillerMode = type == 'marked' ? 'markedNbsp' : 'nbsp';
	}

	/**
	 * Converts an HTML string to its DOM representation. Returns a document fragment containing nodes parsed from
	 * the provided data.
	 */
	protected _toDom( data: string ): DocumentFragment {
		// Wrap data with a <body> tag so leading non-layout nodes (like <script>, <style>, HTML comment)
		// will be preserved in the body collection.
		// Do it only for data that is not a full HTML document.
		if ( !/<(?:html|body|head|meta)(?:\s[^>]*)?>/i.test( data.trim().slice( 0, 10_000 ) ) ) {
			data = `<body>${ data }</body>`;
		}

		const document = this.domParser.parseFromString( data, 'text/html' );
		const fragment = document.createDocumentFragment();
		const bodyChildNodes = document.body.childNodes;

		while ( bodyChildNodes.length > 0 ) {
			fragment.appendChild( bodyChildNodes[ 0 ] );
		}

		return fragment;
	}
}
