/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module table/tablecaption/tablecaptionediting
 */

import { Plugin, type Editor } from 'ckeditor5/src/core.js';
import { ModelElement, enableViewPlaceholder } from 'ckeditor5/src/engine.js';
import { toWidgetEditable } from 'ckeditor5/src/widget.js';

import { injectTableCaptionPostFixer } from '../converters/table-caption-post-fixer.js';
import { ToggleTableCaptionCommand } from './toggletablecaptioncommand.js';
import { isTable, matchTableCaptionViewElement } from './utils.js';

/**
 * The table caption editing plugin.
 */
export class TableCaptionEditing extends Plugin {
	/**
	 * A map that keeps saved JSONified table captions and table model elements they are
	 * associated with.
	 *
	 * To learn more about this system, see {@link #_saveCaption}.
	 */
	private _savedCaptionsMap: WeakMap<ModelElement, unknown>;

	/**
	 * @inheritDoc
	 */
	public static get pluginName() {
		return 'TableCaptionEditing' as const;
	}

	/**
	 * @inheritDoc
	 */
	public static override get isOfficialPlugin(): true {
		return true;
	}

	/**
	 * @inheritDoc
	 */
	constructor( editor: Editor ) {
		super( editor );

		this._savedCaptionsMap = new WeakMap();
	}

	/**
	 * @inheritDoc
	 */
	public init(): void {
		const editor = this.editor;
		const schema = editor.model.schema;
		const view = editor.editing.view;
		const t = editor.t;

		if ( !schema.isRegistered( 'caption' ) ) {
			schema.register( 'caption', {
				allowIn: 'table',
				allowContentOf: '$block',
				isLimit: true
			} );
		} else {
			schema.extend( 'caption', {
				allowIn: 'table'
			} );
		}

		editor.commands.add( 'toggleTableCaption', new ToggleTableCaptionCommand( this.editor ) );

		// View -> model converter for the data pipeline.
		editor.conversion.for( 'upcast' ).elementToElement( {
			view: matchTableCaptionViewElement,
			model: 'caption'
		} );

		// Model -> view converter for the data pipeline.
		editor.conversion.for( 'dataDowncast' ).elementToElement( {
			model: 'caption',
			view: ( modelElement, { writer } ) => {
				if ( !isTable( modelElement.parent ) ) {
					return null;
				}

				return writer.createContainerElement( 'figcaption' );
			}
		} );

		// Model -> view converter for the editing pipeline.
		editor.conversion.for( 'editingDowncast' ).elementToElement( {
			model: 'caption',
			view: ( modelElement, { writer } ) => {
				if ( !isTable( modelElement.parent ) ) {
					return null;
				}

				const figcaptionElement = writer.createEditableElement( 'figcaption' );
				writer.setCustomProperty( 'tableCaption', true, figcaptionElement );

				figcaptionElement.placeholder = t( 'Enter table caption' );

				enableViewPlaceholder( {
					view,
					element: figcaptionElement,
					keepOnFocus: true
				} );

				return toWidgetEditable( figcaptionElement, writer );
			}
		} );

		injectTableCaptionPostFixer( editor.model );
	}

	/**
	 * Returns the saved {@link module:engine/model/element~ModelElement#toJSON JSONified} caption
	 * of a table model element.
	 *
	 * See {@link #_saveCaption}.
	 *
	 * @internal
	 * @param tableModelElement The model element the caption should be returned for.
	 * @returns The model caption element or `null` if there is none.
	 */
	public _getSavedCaption( tableModelElement: ModelElement ): ModelElement | null {
		const jsonObject = this._savedCaptionsMap.get( tableModelElement );

		return jsonObject ? ModelElement.fromJSON( jsonObject ) : null;
	}

	/**
	 * Saves a {@link module:engine/model/element~ModelElement#toJSON JSONified} caption for
	 * a table element to allow restoring it in the future.
	 *
	 * A caption is saved every time it gets hidden. The
	 * user should be able to restore it on demand.
	 *
	 * **Note**: The caption cannot be stored in the table model element attribute because,
	 * for instance, when the model state propagates to collaborators, the attribute would get
	 * lost (mainly because it does not convert to anything when the caption is hidden) and
	 * the states of collaborators' models would de-synchronize causing numerous issues.
	 *
	 * See {@link #_getSavedCaption}.
	 *
	 * @internal
	 * @param tableModelElement The model element the caption is saved for.
	 * @param caption The caption model element to be saved.
	 */
	public _saveCaption( tableModelElement: ModelElement, caption: ModelElement ): void {
		this._savedCaptionsMap.set( tableModelElement, caption.toJSON() );
	}
}
