/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module engine/view/observer/compositionobserver
 */

import { DomEventObserver } from './domeventobserver.js';
import { type EditingView } from '../view.js';
import { type ViewDocumentDomEventData } from './domeventdata.js';

// @if CK_DEBUG_TYPING // const { _debouncedLine, _buildLogMessage } = require( '../../dev-utils/utils.js' );

/**
 * {@link module:engine/view/document~ViewDocument#event:compositionstart Compositionstart},
 * {@link module:engine/view/document~ViewDocument#event:compositionupdate compositionupdate} and
 * {@link module:engine/view/document~ViewDocument#event:compositionend compositionend} events observer.
 *
 * Note that this observer is attached by the {@link module:engine/view/view~EditingView} and is available by default.
 */
export class CompositionObserver extends DomEventObserver<'compositionstart' | 'compositionupdate' | 'compositionend'> {
	/**
	 * @inheritDoc
	 */
	public readonly domEventType = [ 'compositionstart', 'compositionupdate', 'compositionend' ] as const;

	/**
	 * @inheritDoc
	 */
	constructor( view: EditingView ) {
		super( view );

		const document = this.document;

		document.on<ViewDocumentCompositionStartEvent>( 'compositionstart', () => {
			// @if CK_DEBUG_TYPING // if ( ( window as any ).logCKETyping ) {
			// @if CK_DEBUG_TYPING // 	console.log( ..._buildLogMessage( this, 'CompositionObserver',
			// @if CK_DEBUG_TYPING // 		'%c┌───────────────────────────── isComposing = true ─────────────────────────────┐',
			// @if CK_DEBUG_TYPING // 		'font-weight: bold; color: green'
			// @if CK_DEBUG_TYPING // 	) );
			// @if CK_DEBUG_TYPING // }
			document.isComposing = true;
		} );

		document.on<ViewDocumentCompositionEndEvent>( 'compositionend', () => {
			// @if CK_DEBUG_TYPING // if ( ( window as any ).logCKETyping ) {
			// @if CK_DEBUG_TYPING // 	console.log( ..._buildLogMessage( this, 'CompositionObserver',
			// @if CK_DEBUG_TYPING // 		'%c└───────────────────────────── isComposing = false ─────────────────────────────┘',
			// @if CK_DEBUG_TYPING // 		'font-weight: bold; color: green'
			// @if CK_DEBUG_TYPING // 	) );
			// @if CK_DEBUG_TYPING // }
			document.isComposing = false;
		} );
	}

	/**
	 * @inheritDoc
	 */
	public onDomEvent( domEvent: CompositionEvent ): void {
		// @if CK_DEBUG_TYPING // if ( ( window as any ).logCKETyping ) {
		// @if CK_DEBUG_TYPING // 	_debouncedLine();
		// @if CK_DEBUG_TYPING // 	console.group( ..._buildLogMessage( this, 'CompositionObserver',
		// @if CK_DEBUG_TYPING // 		`${ domEvent.type }`
		// @if CK_DEBUG_TYPING // 	) );
		// @if CK_DEBUG_TYPING // }

		this.fire( domEvent.type, domEvent, {
			data: domEvent.data
		} );

		// @if CK_DEBUG_TYPING // if ( ( window as any ).logCKETyping ) {
		// @if CK_DEBUG_TYPING // 	console.groupEnd();
		// @if CK_DEBUG_TYPING // }
	}
}

export interface ViewDocumentCompositionEventData extends ViewDocumentDomEventData<CompositionEvent> {
	data: string | null;
}

/**
 * Fired when composition starts inside one of the editables.
 *
 * Introduced by {@link module:engine/view/observer/compositionobserver~CompositionObserver}.
 *
 * Note that because {@link module:engine/view/observer/compositionobserver~CompositionObserver} is attached by the
 * {@link module:engine/view/view~EditingView} this event is available by default.
 *
 * @see module:engine/view/observer/compositionobserver~CompositionObserver
 * @eventName module:engine/view/document~ViewDocument#compositionstart
 * @param data Event data.
 */
export type ViewDocumentCompositionStartEvent = {
	name: 'compositionstart';
	args: [ data: ViewDocumentCompositionEventData ];
};

/**
 * Fired when composition is updated inside one of the editables.
 *
 * Introduced by {@link module:engine/view/observer/compositionobserver~CompositionObserver}.
 *
 * Note that because {@link module:engine/view/observer/compositionobserver~CompositionObserver} is attached by the
 * {@link module:engine/view/view~EditingView} this event is available by default.
 *
 * @see module:engine/view/observer/compositionobserver~CompositionObserver
 * @eventName module:engine/view/document~ViewDocument#compositionupdate
 * @param data Event data.
 */
export type ViewDocumentCompositionUpdateEvent = {
	name: 'compositionupdate';
	args: [ data: ViewDocumentCompositionEventData ];
};

/**
 * Fired when composition ends inside one of the editables.
 *
 * Introduced by {@link module:engine/view/observer/compositionobserver~CompositionObserver}.
 *
 * Note that because {@link module:engine/view/observer/compositionobserver~CompositionObserver} is attached by the
 * {@link module:engine/view/view~EditingView} this event is available by default.
 *
 * @see module:engine/view/observer/compositionobserver~CompositionObserver
 * @eventName module:engine/view/document~ViewDocument#compositionend
 * @param data Event data.
 */
export type ViewDocumentCompositionEndEvent = {
	name: 'compositionend';
	args: [ data: ViewDocumentCompositionEventData ];
};
