/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/matcher
 */

import { type ViewElement } from './element.js';
import { logWarning } from '@ckeditor/ckeditor5-utils';
import { normalizeConsumables, type Consumables } from '../conversion/viewconsumable.js';

/**
 * View matcher class.
 * Instance of this class can be used to find {@link module:engine/view/element~ViewElement elements} that match given pattern.
 */
export class Matcher {
	private readonly _patterns: Array<MatcherFunctionPattern | MatcherObjectPattern> = [];

	/**
	 * Creates new instance of Matcher.
	 *
	 * @param pattern Match patterns. See {@link module:engine/view/matcher~Matcher#add add method} for more information.
	 */
	constructor( ...pattern: Array<MatcherPattern> ) {
		this.add( ...pattern );
	}

	/**
	 * Adds pattern or patterns to matcher instance.
	 *
	 * ```ts
	 * // String.
	 * matcher.add( 'div' );
	 *
	 * // Regular expression.
	 * matcher.add( /^\w/ );
	 *
	 * // Single class.
	 * matcher.add( {
	 * 	classes: 'foobar'
	 * } );
	 * ```
	 *
	 * See {@link module:engine/view/matcher~MatcherPattern} for more examples.
	 *
	 * Multiple patterns can be added in one call:
	 *
	 * ```ts
	 * matcher.add( 'div', { classes: 'foobar' } );
	 * ```
	 *
	 * @param pattern Object describing pattern details. If string or regular expression
	 * is provided it will be used to match element's name. Pattern can be also provided in a form
	 * of a function - then this function will be called with each {@link module:engine/view/element~ViewElement element} as a parameter.
	 * Function's return value will be stored under `match` key of the object returned from
	 * {@link module:engine/view/matcher~Matcher#match match} or {@link module:engine/view/matcher~Matcher#matchAll matchAll} methods.
	 */
	public add( ...pattern: Array<MatcherPattern> ): void {
		for ( let item of pattern ) {
			// String or RegExp pattern is used as element's name.
			if ( typeof item == 'string' || item instanceof RegExp ) {
				item = { name: item };
			}

			this._patterns.push( item );
		}
	}

	/**
	 * Matches elements for currently stored patterns. Returns match information about first found
	 * {@link module:engine/view/element~ViewElement element}, otherwise returns `null`.
	 *
	 * Example of returned object:
	 *
	 * ```ts
	 * {
	 * 	element: <instance of found element>,
	 * 	pattern: <pattern used to match found element>,
	 * 	match: {
	 * 		name: true,
	 * 		attributes: [
	 * 			[ 'title' ],
	 * 			[ 'href' ],
	 * 			[ 'class', 'foo' ],
	 * 			[ 'style', 'color' ],
	 * 			[ 'style', 'position' ]
	 * 		]
	 * 	}
	 * }
	 * ```
	 *
	 * You could use the `match` field from the above returned object as an input for the
	 * {@link module:engine/conversion/viewconsumable~ViewConsumable#test `ViewConsumable#test()`} and
	 * {@link module:engine/conversion/viewconsumable~ViewConsumable#consume `ViewConsumable#consume()`} methods.
	 *
	 * @see module:engine/view/matcher~Matcher#add
	 * @see module:engine/view/matcher~Matcher#matchAll
	 * @param element View element to match against stored patterns.
	 * @returns The match information about found element or `null`.
	 */
	public match( ...element: Array<ViewElement> ): MatchResult | null {
		for ( const singleElement of element ) {
			for ( const pattern of this._patterns ) {
				const match = this._isElementMatching( singleElement, pattern );

				if ( match ) {
					return {
						element: singleElement,
						pattern,
						match
					};
				}
			}
		}

		return null;
	}

	/**
	 * Matches elements for currently stored patterns. Returns array of match information with all found
	 * {@link module:engine/view/element~ViewElement elements}. If no element is found - returns `null`.
	 *
	 * @see module:engine/view/matcher~Matcher#add
	 * @see module:engine/view/matcher~Matcher#match
	 * @param element View element to match against stored patterns.
	 * @returns Array with match information about found elements or `null`. For more information
	 * see {@link module:engine/view/matcher~Matcher#match match method} description.
	 */
	public matchAll( ...element: Array<ViewElement> ): Array<MatchResult> | null {
		const results: Array<MatchResult> = [];

		for ( const singleElement of element ) {
			for ( const pattern of this._patterns ) {
				const match = this._isElementMatching( singleElement, pattern );

				if ( match ) {
					results.push( {
						element: singleElement,
						pattern,
						match
					} );
				}
			}
		}

		return results.length > 0 ? results : null;
	}

	/**
	 * Returns the name of the element to match if there is exactly one pattern added to the matcher instance
	 * and it matches element name defined by `string` (not `RegExp`). Otherwise, returns `null`.
	 *
	 * @returns Element name trying to match.
	 */
	public getElementName(): string | null {
		if ( this._patterns.length !== 1 ) {
			return null;
		}

		const pattern = this._patterns[ 0 ];
		const name = pattern.name;

		return ( typeof pattern != 'function' && name && !( name instanceof RegExp ) ) ? name : null;
	}

	/**
	 * Returns match information if {@link module:engine/view/element~ViewElement element} is matching provided pattern.
	 * If element cannot be matched to provided pattern - returns `null`.
	 *
	 * @returns Returns object with match information or null if element is not matching.
	 */
	private _isElementMatching( element: ViewElement, pattern: MatcherFunctionPattern | MatcherObjectPattern ): Match | null {
		// If pattern is provided as function - return result of that function;
		if ( typeof pattern == 'function' ) {
			const match = pattern( element );

			// In some places we use Matcher with callback pattern that returns boolean.
			if ( !match || typeof match != 'object' ) {
				return match;
			}

			return normalizeConsumables( match );
		}

		const match: Match = {};

		// Check element's name.
		if ( pattern.name ) {
			match.name = matchName( pattern.name, element.name );

			if ( !match.name ) {
				return null;
			}
		}

		const attributesMatch: Array<[ string, string? ]> = [];

		// Check element's attributes.
		if ( pattern.attributes && !matchAttributes( pattern.attributes, element, attributesMatch ) ) {
			return null;
		}

		// Check element's classes.
		if ( pattern.classes && !matchClasses( pattern.classes, element, attributesMatch ) ) {
			return null;
		}

		// Check element's styles.
		if ( pattern.styles && !matchStyles( pattern.styles, element, attributesMatch ) ) {
			return null;
		}

		// Note the `attributesMatch` array is populated by the above calls.
		if ( attributesMatch.length ) {
			match.attributes = attributesMatch;
		}

		return match;
	}
}

/**
 * Returns true if the given `item` matches the pattern.
 *
 * @internal
 * @param pattern A pattern representing a key/value we want to match.
 * @param item An actual item key/value (e.g. `'src'`, `'background-color'`, `'ck-widget'`) we're testing against pattern.
 */
export function isPatternMatched(
	pattern: true | string | RegExp,
	item: string
): unknown {
	return pattern === true ||
		pattern === item ||
		pattern instanceof RegExp && !!String( item ).match( pattern );
}

/**
 * Checks if name can be matched by provided pattern.
 *
 * @returns Returns `true` if name can be matched, `false` otherwise.
 */
function matchName( pattern: string | RegExp, name: string ): boolean {
	// If pattern is provided as RegExp - test against this regexp.
	if ( pattern instanceof RegExp ) {
		return !!name.match( pattern );
	}

	return pattern === name;
}

/**
 * Bring all the possible pattern forms to an array of tuples where first item is a key, second is a value,
 * and third optional is a token value.
 *
 * Examples:
 *
 * Boolean pattern value:
 *
 * ```ts
 * true
 * ```
 *
 * to
 *
 * ```ts
 * [ [ true, true ] ]
 * ```
 *
 * Textual pattern value:
 *
 * ```ts
 * 'attribute-name-or-class-or-style'
 * ```
 *
 * to
 *
 * ```ts
 * [ [ 'attribute-name-or-class-or-style', true ] ]
 * ```
 *
 * Regular expression:
 *
 * ```ts
 * /^data-.*$/
 * ```
 *
 * to
 *
 * ```ts
 * [ [ /^data-.*$/, true ] ]
 * ```
 *
 * Objects (plain or with `key` and `value` specified explicitly):
 *
 * ```ts
 * {
 * 	src: /^https:.*$/
 * }
 * ```
 *
 * or
 *
 * ```ts
 * [ {
 * 	key: 'src',
 * 	value: /^https:.*$/
 * } ]
 * ```
 *
 * to:
 *
 * ```ts
 * [ [ 'src', /^https:.*$/ ] ]
 * ```
 *
 * @returns Returns an array of objects or null if provided patterns were not in an expected form.
 */
function normalizePatterns( patterns: MatchPropertyPatterns, prefix?: string ): Array<NormalizedPropertyPattern> {
	if ( Array.isArray( patterns ) ) {
		return patterns.map( pattern => {
			if ( typeof pattern !== 'object' || pattern instanceof RegExp ) {
				return prefix ?
					[ prefix, pattern, true ] :
					[ pattern, true ];
			}

			if ( pattern.key === undefined || pattern.value === undefined ) {
				// Documented at the end of matcher.js.
				logWarning( 'matcher-pattern-missing-key-or-value', pattern );
			}

			return prefix ?
				[ prefix, pattern.key, pattern.value ] :
				[ pattern.key, pattern.value ];
		} );
	}

	if ( typeof patterns !== 'object' || patterns instanceof RegExp ) {
		return [
			prefix ?
				[ prefix, patterns, true ] :
				[ patterns, true ]
		];
	}

	// Below we do what Object.entries() does, but faster
	const normalizedPatterns: Array<NormalizedPropertyPattern> = [];

	for ( const key in patterns ) {
		// Replace with Object.hasOwn() when we upgrade to es2022.
		if ( Object.prototype.hasOwnProperty.call( patterns, key ) ) {
			normalizedPatterns.push(
				prefix ?
					[ prefix, key, patterns[ key ] ] :
					[ key, patterns[ key ] ]
			);
		}
	}

	return normalizedPatterns;
}

/**
 * Checks if attributes of provided element can be matched against provided patterns.
 *
 * @param patterns Object with information about attributes to match. Each key of the object will be
 * used as attribute name. Value of each key can be a string or regular expression to match against attribute value.
 * @param  element Element which attributes will be tested.
 * @param match An array to populate with matching tuples.
 * @returns Returns array with matched attribute names or `null` if no attributes were matched.
 */
function matchAttributes(
	patterns: MatchAttributePatterns,
	element: ViewElement,
	match: Array<[ string, string? ]>
): boolean {
	let excludeAttributes;

	// `style` and `class` attribute keys are deprecated. Only allow them in object pattern
	// for backward compatibility.
	if ( typeof patterns === 'object' && !( patterns instanceof RegExp ) && !Array.isArray( patterns ) ) {
		if ( patterns.style !== undefined ) {
			// Documented at the end of matcher.js.
			logWarning( 'matcher-pattern-deprecated-attributes-style-key', patterns );
		}
		if ( patterns.class !== undefined ) {
			// Documented at the end of matcher.js.
			logWarning( 'matcher-pattern-deprecated-attributes-class-key', patterns );
		}
	} else {
		excludeAttributes = [ 'class', 'style' ];
	}

	return element._collectAttributesMatch( normalizePatterns( patterns ), match, excludeAttributes );
}

/**
 * Checks if classes of provided element can be matched against provided patterns.
 *
 * @param patterns Array of strings or regular expressions to match against element's classes.
 * @param element Element which classes will be tested.
 * @param match An array to populate with matching tuples.
 * @returns Returns array with matched class names or `null` if no classes were matched.
 */
function matchClasses(
	patterns: MatchClassPatterns,
	element: ViewElement,
	match: Array<[ string, string? ]>
): boolean {
	return element._collectAttributesMatch( normalizePatterns( patterns, 'class' ), match );
}

/**
 * Checks if styles of provided element can be matched against provided patterns.
 *
 * @param patterns Object with information about styles to match. Each key of the object will be
 * used as style name. Value of each key can be a string or regular expression to match against style value.
 * @param element Element which styles will be tested.
 * @param match An array to populate with matching tuples.
 * @returns Returns array with matched style names or `null` if no styles were matched.
 */
function matchStyles(
	patterns: MatchStylePatterns,
	element: ViewElement,
	match: Array<[ string, string? ]>
): boolean {
	return element._collectAttributesMatch( normalizePatterns( patterns, 'style' ), match );
}

/**
 * An entity that is a valid pattern recognized by a matcher. `MatcherPattern` is used by {@link ~Matcher} to recognize
 * if a view element fits in a group of view elements described by the pattern.
 *
 * `MatcherPattern` can be given as a `String`, a `RegExp`, an `Object` or a `Function`.
 *
 * If `MatcherPattern` is given as a `String` or `RegExp`, it will match any view element that has a matching name:
 *
 * ```ts
 * // Match any element with name equal to 'div'.
 * const pattern = 'div';
 *
 * // Match any element which name starts on 'p'.
 * const pattern = /^p/;
 * ```
 *
 * If `MatcherPattern` is given as an `Object`, all the object's properties will be matched with view element properties.
 * If the view element does not meet all of the object's pattern properties, the match will not happen.
 * Available `Object` matching properties:
 *
 * Matching view element:
 *
 * ```ts
 * // Match view element's name using String:
 * const pattern = { name: 'p' };
 *
 * // or by providing RegExp:
 * const pattern = { name: /^(ul|ol)$/ };
 *
 * // The name can also be skipped to match any view element with matching attributes:
 * const pattern = {
 * 	attributes: {
 * 		'title': true
 * 	}
 * };
 * ```
 *
 * Matching view element attributes:
 *
 * ```ts
 * // Match view element with any attribute value.
 * const pattern = {
 * 	name: 'p',
 * 	attributes: true
 * };
 *
 * // Match view element which has matching attributes (String).
 * const pattern = {
 * 	name: 'figure',
 * 	attributes: 'title' // Match title attribute (can be empty).
 * };
 *
 * // Match view element which has matching attributes (RegExp).
 * const pattern = {
 * 	name: 'figure',
 * 	attributes: /^data-.*$/ // Match attributes starting with `data-` e.g. `data-foo` with any value (can be empty).
 * };
 *
 * // Match view element which has matching attributes (Object).
 * const pattern = {
 * 	name: 'figure',
 * 	attributes: {
 * 		title: 'foobar',           // Match `title` attribute with 'foobar' value.
 * 		alt: true,                 // Match `alt` attribute with any value (can be empty).
 * 		'data-type': /^(jpg|png)$/ // Match `data-type` attribute with `jpg` or `png` value.
 * 	}
 * };
 *
 * // Match view element which has matching attributes (Array).
 * const pattern = {
 * 	name: 'figure',
 * 	attributes: [
 * 		'title',    // Match `title` attribute (can be empty).
 * 		/^data-*$/ // Match attributes starting with `data-` e.g. `data-foo` with any value (can be empty).
 * 	]
 * };
 *
 * // Match view element which has matching attributes (key-value pairs).
 * const pattern = {
 * 	name: 'input',
 * 	attributes: [
 * 		{
 * 			key: 'type',                     // Match `type` as an attribute key.
 * 			value: /^(text|number|date)$/	 // Match `text`, `number` or `date` values.
 * 		},
 * 		{
 * 			key: /^data-.*$/,                // Match attributes starting with `data-` e.g. `data-foo`.
 * 			value: true                      // Match any value (can be empty).
 * 		}
 * 	]
 * };
 * ```
 *
 * Matching view element styles:
 *
 * ```ts
 * // Match view element with any style.
 * const pattern = {
 * 	name: 'p',
 * 	styles: true
 * };
 *
 * // Match view element which has matching styles (String).
 * const pattern = {
 * 	name: 'p',
 * 	styles: 'color' // Match attributes with `color` style.
 * };
 *
 * // Match view element which has matching styles (RegExp).
 * const pattern = {
 * 	name: 'p',
 * 	styles: /^border.*$/ // Match view element with any border style.
 * };
 *
 * // Match view element which has matching styles (Object).
 * const pattern = {
 * 	name: 'p',
 * 	styles: {
 * 		color: /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/, // Match `color` in RGB format only.
 * 		'font-weight': 600,                              // Match `font-weight` only if it's `600`.
 * 		'text-decoration': true                          // Match any text decoration.
 * 	}
 * };
 *
 * // Match view element which has matching styles (Array).
 * const pattern = {
 * 	name: 'p',
 * 	styles: [
 * 		'color',      // Match `color` with any value.
 * 		/^border.*$/ // Match all border properties.
 * 	]
 * };
 *
 * // Match view element which has matching styles (key-value pairs).
 * const pattern = {
 * 	name: 'p',
 * 	styles: [
 * 		{
 * 			key: 'color',                                  		// Match `color` as an property key.
 * 			value: /rgb\((\d{1,3}), (\d{1,3}), (\d{1,3})\)/		// Match RGB format only.
 * 		},
 * 		{
 * 			key: /^border.*$/, // Match any border style.
 * 			value: true        // Match any value.
 * 		}
 * 	]
 * };
 * ```
 *
 * Matching view element classes:
 *
 * ```ts
 * // Match view element with any class.
 * const pattern = {
 * 	name: 'p',
 * 	classes: true
 * };
 *
 * // Match view element which has matching class (String).
 * const pattern = {
 * 	name: 'p',
 * 	classes: 'highlighted' // Match `highlighted` class.
 * };
 *
 * // Match view element which has matching classes (RegExp).
 * const pattern = {
 * 	name: 'figure',
 * 	classes: /^image-side-(left|right)$/ // Match `image-side-left` or `image-side-right` class.
 * };
 *
 * // Match view element which has matching classes (Object).
 * const pattern = {
 * 	name: 'p',
 * 	classes: {
 * 		highlighted: true, // Match `highlighted` class.
 * 		marker: true       // Match `marker` class.
 * 	}
 * };
 *
 * // Match view element which has matching classes (Array).
 * const pattern = {
 * 	name: 'figure',
 * 	classes: [
 * 		'image',                    // Match `image` class.
 * 		/^image-side-(left|right)$/ // Match `image-side-left` or `image-side-right` class.
 * 	]
 * };
 *
 * // Match view element which has matching classes (key-value pairs).
 * const pattern = {
 * 	name: 'figure',
 * 	classes: [
 * 		{
 * 			key: 'image', // Match `image` class.
 * 			value: true
 * 		},
 * 		{
 * 			key: /^image-side-(left|right)$/, // Match `image-side-left` or `image-side-right` class.
 * 			value: true
 * 		}
 * 	]
 * };
 * ```
 *
 * Pattern can combine multiple properties allowing for more complex view element matching:
 *
 * ```ts
 * const pattern = {
 * 	name: 'span',
 * 	attributes: [ 'title' ],
 * 	styles: {
 * 		'font-weight': 'bold'
 * 	},
 * 	classes: 'highlighted'
 * };
 * ```
 *
 * If `MatcherPattern` is given as a `Function`, the function takes a view element as a first and only parameter and
 * the function should decide whether that element matches. If so, it should return what part of the view element has been matched.
 * Otherwise, the function should return `null`. The returned result will be included in `match` property of the object
 * returned by {@link ~Matcher#match} call.
 *
 * ```ts
 * // Match an empty <div> element.
 * const pattern = element => {
 * 	if ( element.name == 'div' && element.childCount > 0 ) {
 * 		// Return which part of the element was matched.
 * 		return { name: true };
 * 	}
 *
 * 	return null;
 * };
 *
 * // Match a <p> element with big font ("heading-like" element).
 * const pattern = element => {
 * 	if ( element.name == 'p' ) {
 * 		const fontSize = element.getStyle( 'font-size' );
 * 		const size = fontSize.match( /(\d+)/px );
 *
 * 		if ( size && Number( size[ 1 ] ) > 26 ) {
 * 			return { name: true, styles: [ 'font-size' ] };
 * 		}
 * 	}
 *
 * 	return null;
 * };
 * ```
 *
 * `MatcherPattern` is defined in a way that it is a superset of {@link module:engine/view/elementdefinition~ViewElementDefinition},
 * that is, every `ElementDefinition` also can be used as a `MatcherPattern`.
 */
export type MatcherPattern = string | RegExp | MatcherFunctionPattern | MatcherObjectPattern;

/**
 * A function describing `MatcherPattern`. See {@link ~MatcherPattern} for examples and other options.
 */
export type MatcherFunctionPattern = ( element: ViewElement ) => Match | Consumables | null;

/**
 * An object describing `MatcherPattern`. See {@link ~MatcherPattern} for examples and other options.
 */
export interface MatcherObjectPattern {

	/**
	 * View element name to match.
	 */
	name?: string | RegExp;

	/**
	 * View element's classes to match.
	 */
	classes?: MatchClassPatterns;

	/**
	 * View element's styles to match.
	 */
	styles?: MatchStylePatterns;

	/**
	 * View element's attributes to match.
	 */
	attributes?: MatchAttributePatterns;
}

/**
 * An object representing matched element parts.
 */
export interface Match {

	/**
	 * True if name of the element was matched.
	 */
	name?: boolean;

	/**
	 * Array of matching tuples: attribute name, and optional token for tokenized attributes.
	 * Note that there could be multiple entries for the same attribute with different tokens (class names or style properties).
	 */
	attributes?: Array<[string, string?]>;
}

/**
 * The result of {@link ~Matcher#match}.
 */
export interface MatchResult {

	/**
	 * Matched view element.
	 */
	element: ViewElement;

	/**
	 * Pattern that was used to find matched element.
	 */
	pattern: MatcherFunctionPattern | MatcherObjectPattern;

	/**
	 * An object representing matched element parts.
	 */
	match: Match;
}

export type MatchPropertyPatterns<ValuePattern = string | RegExp> =
	true |
	string |
	RegExp |
	Record<string, true | ValuePattern> |
	Array<string | RegExp | { key: string | RegExp; value: true | ValuePattern }>;

export type MatchAttributePatterns = MatchPropertyPatterns;
export type MatchStylePatterns = MatchPropertyPatterns;
export type MatchClassPatterns = MatchPropertyPatterns<never>;

/**
 * @internal
 */
export type NormalizedPropertyPattern = [
	true | string | RegExp,
	true | string | RegExp,
	( true | string | RegExp )?
];

/**
 * The key-value matcher pattern is missing key or value. Both must be present.
 * Refer the documentation: {@link module:engine/view/matcher~MatcherPattern}.
 *
 * @param pattern Pattern with missing properties.
 * @error matcher-pattern-missing-key-or-value
 */

/**
 * The key-value matcher pattern for `attributes` option is using deprecated `style` key.
 *
 * Use `styles` matcher pattern option instead:
 *
 * ```ts
 * // Instead of:
 * const pattern = {
 * 	attributes: {
 * 		key1: 'value1',
 * 		key2: 'value2',
 * 		style: /^border.*$/
 * 	}
 * }
 *
 * // Use:
 * const pattern = {
 * 	attributes: {
 * 		key1: 'value1',
 * 		key2: 'value2'
 * 	},
 * 	styles: /^border.*$/
 * }
 * ```
 *
 * Refer to the {@glink updating/guides/update-to-29##update-to-ckeditor-5-v2910 Migration to v29.1.0} guide
 * and {@link module:engine/view/matcher~MatcherPattern} documentation.
 *
 * @param pattern Pattern with missing properties.
 * @error matcher-pattern-deprecated-attributes-style-key
 */

/**
 * The key-value matcher pattern for `attributes` option is using deprecated `class` key.
 *
 * Use `classes` matcher pattern option instead:
 *
 * ```ts
 * // Instead of:
 * const pattern = {
 * 	attributes: {
 * 		key1: 'value1',
 * 		key2: 'value2',
 * 		class: 'foobar'
 * 	}
 * }
 *
 * // Use:
 * const pattern = {
 * 	attributes: {
 * 		key1: 'value1',
 * 		key2: 'value2'
 * 	},
 * 	classes: 'foobar'
 * }
 * ```
 *
 * Refer to the {@glink updating/guides/update-to-29##update-to-ckeditor-5-v2910 Migration to v29.1.0} guide
 * and the {@link module:engine/view/matcher~MatcherPattern} documentation.
 *
 * @param pattern Pattern with missing properties.
 * @error matcher-pattern-deprecated-attributes-class-key
 */
