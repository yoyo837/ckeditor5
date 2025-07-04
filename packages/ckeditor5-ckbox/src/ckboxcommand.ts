/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module ckbox/ckboxcommand
 */

import type { ModelWriter } from 'ckeditor5/src/engine.js';
import { Command, type Editor } from 'ckeditor5/src/core.js';
import { createElement, toMap } from 'ckeditor5/src/utils.js';

import type {
	CKBoxAssetDefinition,
	CKBoxAssetImageAttributesDefinition,
	CKBoxAssetImageDefinition,
	CKBoxAssetLinkAttributesDefinition,
	CKBoxAssetLinkDefinition,
	CKBoxConfig,
	CKBoxRawAssetDefinition
} from './ckboxconfig.js';

import { blurHashToDataUrl, getImageUrls } from './utils.js';

// Defines the waiting time (in milliseconds) for inserting the chosen asset into the model. The chosen asset is temporarily stored in the
// `CKBoxCommand#_chosenAssets` and it is removed from there automatically after this time. See `CKBoxCommand#_chosenAssets` for more
// details.
const ASSET_INSERTION_WAIT_TIMEOUT = 1000;

/**
 * The CKBox command. It is used by the {@link module:ckbox/ckboxediting~CKBoxEditing CKBox editing feature} to open the CKBox file manager.
 * The file manager allows inserting an image or a link to a file into the editor content.
 *
 * ```ts
 * editor.execute( 'ckbox' );
 * ```
 *
 * **Note:** This command uses other features to perform the following tasks:
 * - To insert images it uses the {@link module:image/image/insertimagecommand~InsertImageCommand 'insertImage'} command from the
 * {@link module:image/image~Image Image feature}.
 * - To insert links to other files it uses the {@link module:link/linkcommand~LinkCommand 'link'} command from the
 * {@link module:link/link~Link Link feature}.
 */
export class CKBoxCommand extends Command {
	declare public value: boolean;

	/**
	 * A set of all chosen assets. They are stored temporarily and they are automatically removed 1 second after being chosen.
	 * Chosen assets have to be "remembered" for a while to be able to map the given asset with the element inserted into the model.
	 * This association map is then used to set the ID on the model element.
	 *
	 * All chosen assets are automatically removed after the timeout, because (theoretically) it may happen that they will never be
	 * inserted into the model, even if the {@link module:link/linkcommand~LinkCommand `'link'`} command or the
	 * {@link module:image/image/insertimagecommand~InsertImageCommand `'insertImage'`} command is enabled. Such a case may arise when
	 * another plugin blocks the command execution. Then, in order not to keep the chosen (but not inserted) assets forever, we delete
	 * them automatically to prevent memory leakage. The 1 second timeout is enough to insert the asset into the model and extract the
	 * ID from the chosen asset.
	 *
	 * The assets are stored only if
	 * the {@link module:ckbox/ckboxconfig~CKBoxConfig#ignoreDataId `config.ckbox.ignoreDataId`} option is set to `false` (by default).
	 *
	 * @internal
	 */
	public readonly _chosenAssets = new Set<CKBoxAssetDefinition>();

	/**
	 * The DOM element that acts as a mounting point for the CKBox dialog.
	 */
	private _wrapper: Element | null = null;

	/**
	 * @inheritDoc
	 */
	constructor( editor: Editor ) {
		super( editor );

		this._initListeners();
	}

	/**
	 * @inheritDoc
	 */
	public override refresh(): void {
		this.value = this._getValue();
		this.isEnabled = this._checkEnabled();
	}

	/**
	 * @inheritDoc
	 */
	public override execute(): void {
		this.fire<CKBoxEvent<'open'>>( 'ckbox:open' );
	}

	/**
	 * Indicates if the CKBox dialog is already opened.
	 *
	 * @protected
	 * @returns {Boolean}
	 */
	private _getValue(): boolean {
		return this._wrapper !== null;
	}

	/**
	 * Checks whether the command can be enabled in the current context.
	 */
	private _checkEnabled() {
		const imageCommand = this.editor.commands.get( 'insertImage' )!;
		const linkCommand = this.editor.commands.get( 'link' )!;

		if ( !imageCommand.isEnabled && !linkCommand.isEnabled ) {
			return false;
		}

		return true;
	}

	/**
	 * Creates the options object for the CKBox dialog.
	 *
	 * @returns The object with properties:
	 * - theme The theme for CKBox dialog.
	 * - language The language for CKBox dialog.
	 * - tokenUrl The token endpoint URL.
	 * - serviceOrigin The base URL of the API service.
	 * - forceDemoLabel Whether to force "Powered by CKBox" link.
	 * - assets.onChoose The callback function invoked after choosing the assets.
	 * - dialog.onClose The callback function invoked after closing the CKBox dialog.
	 * - dialog.width The dialog width in pixels.
	 * - dialog.height The dialog height in pixels.
	 * - categories.icons Allows setting custom icons for categories.
	 * - view.openLastView Sets if the last view visited by the user will be reopened
	 * on the next startup.
	 * - view.startupFolderId Sets the ID of the folder that will be opened on startup.
	 * - view.startupCategoryId Sets the ID of the category that will be opened on startup.
	 * - view.hideMaximizeButton Sets whether to hide the ‘Maximize’ button.
	 * - view.componentsHideTimeout Sets timeout after which upload components are hidden
	 * after completed upload.
	 * - view.dialogMinimizeTimeout Sets timeout after which upload dialog is minimized
	 * after completed upload.
	 */
	private _prepareOptions() {
		const editor = this.editor;
		const ckboxConfig = editor.config.get( 'ckbox' )!;

		const dialog = ckboxConfig.dialog;
		const categories = ckboxConfig.categories;
		const view = ckboxConfig.view;
		const upload = ckboxConfig.upload;

		return {
			theme: ckboxConfig.theme,
			language: ckboxConfig.language,
			tokenUrl: ckboxConfig.tokenUrl,
			serviceOrigin: ckboxConfig.serviceOrigin,
			forceDemoLabel: ckboxConfig.forceDemoLabel,
			choosableFileExtensions: ckboxConfig.choosableFileExtensions,
			assets: {
				onChoose: ( assets: Array<CKBoxRawAssetDefinition> ) => this.fire<CKBoxEvent<'choose'>>( 'ckbox:choose', assets )
			},
			dialog: {
				onClose: () => this.fire<CKBoxEvent<'close'>>( 'ckbox:close' ),
				width: dialog && dialog.width,
				height: dialog && dialog.height
			},
			categories: categories && {
				icons: categories.icons
			},
			view: view && {
				openLastView: view.openLastView,
				startupFolderId: view.startupFolderId,
				startupCategoryId: view.startupCategoryId,
				hideMaximizeButton: view.hideMaximizeButton
			},
			upload: upload && {
				componentsHideTimeout: upload.componentsHideTimeout,
				dialogMinimizeTimeout: upload.dialogMinimizeTimeout
			}
		};
	}

	/**
	 * Initializes various event listeners for the `ckbox:*` events, because all functionality of the `ckbox` command is event-based.
	 */
	private _initListeners() {
		const editor = this.editor;
		const model = editor.model;
		const shouldInsertDataId = !editor.config.get( 'ckbox.ignoreDataId' );
		const downloadableFilesConfig = editor.config.get( 'ckbox.downloadableFiles' );

		// Refresh the command after firing the `ckbox:*` event.
		this.on<CKBoxEvent>( 'ckbox', () => {
			this.refresh();
		}, { priority: 'low' } );

		// Handle opening of the CKBox dialog.
		this.on<CKBoxEvent<'open'>>( 'ckbox:open', () => {
			if ( !this.isEnabled || this.value ) {
				return;
			}

			this._wrapper = createElement( document, 'div', { class: 'ck ckbox-wrapper' } );
			document.body.appendChild( this._wrapper );

			window.CKBox.mount( this._wrapper, this._prepareOptions() );
		} );

		// Handle closing of the CKBox dialog.
		this.on<CKBoxEvent<'close'>>( 'ckbox:close', () => {
			if ( !this.value ) {
				return;
			}

			this._wrapper!.remove();
			this._wrapper = null;

			editor.editing.view.focus();
		} );

		// Handle choosing the assets.
		this.on<CKBoxEvent<'choose'>>( 'ckbox:choose', ( evt, assets ) => {
			if ( !this.isEnabled ) {
				return;
			}

			const imageCommand = editor.commands.get( 'insertImage' )!;
			const linkCommand = editor.commands.get( 'link' )!;

			const assetsToProcess = prepareAssets( {
				assets,
				downloadableFilesConfig,
				isImageAllowed: imageCommand.isEnabled,
				isLinkAllowed: linkCommand.isEnabled
			} );

			const assetsCount = assetsToProcess.length;

			if ( assetsCount === 0 ) {
				return;
			}

			// All assets are inserted in one undo step.
			model.change( writer => {
				for ( const asset of assetsToProcess ) {
					const isLastAsset = asset === assetsToProcess[ assetsCount - 1 ];
					const isSingleAsset = assetsCount === 1;

					this._insertAsset( asset, isLastAsset, writer, isSingleAsset );

					// If asset ID must be set for the inserted model element, store the asset temporarily and remove it automatically
					// after the timeout.
					if ( shouldInsertDataId ) {
						setTimeout( () => this._chosenAssets.delete( asset ), ASSET_INSERTION_WAIT_TIMEOUT );

						this._chosenAssets.add( asset );
					}
				}
			} );

			editor.editing.view.focus();
		} );

		// Clean up after the editor is destroyed.
		this.listenTo( editor, 'destroy', () => {
			this.fire<CKBoxEvent<'close'>>( 'ckbox:close' );
			this._chosenAssets.clear();
		} );
	}

	/**
	 * Inserts the asset into the model.
	 *
	 * @param asset The asset to be inserted.
	 * @param isLastAsset Indicates if the current asset is the last one from the chosen set.
	 * @param writer An instance of the model writer.
	 * @param isSingleAsset It's true when only one asset is processed.
	 */
	private _insertAsset(
		asset: CKBoxAssetDefinition,
		isLastAsset: boolean,
		writer: ModelWriter,
		isSingleAsset: boolean
	) {
		const editor = this.editor;
		const model = editor.model;
		const selection = model.document.selection;

		// Remove the `linkHref` attribute to not affect the asset to be inserted.
		writer.removeSelectionAttribute( 'linkHref' );

		if ( asset.type === 'image' ) {
			this._insertImage( asset );
		} else {
			this._insertLink( asset, writer, isSingleAsset );
		}

		// Except for the last chosen asset, move the selection to the end of the current range to avoid overwriting other, already
		// inserted assets.
		if ( !isLastAsset ) {
			writer.setSelection( selection.getLastPosition() );
		}
	}

	/**
	 * Inserts the image by calling the `insertImage` command.
	 *
	 * @param asset The asset to be inserted.
	 */
	private _insertImage( asset: CKBoxAssetImageDefinition ) {
		const editor = this.editor;
		const {
			imageFallbackUrl,
			imageSources,
			imageTextAlternative,
			imageWidth,
			imageHeight,
			imagePlaceholder
		} = asset.attributes;

		editor.execute( 'insertImage', {
			source: {
				src: imageFallbackUrl,
				sources: imageSources,
				alt: imageTextAlternative,
				width: imageWidth,
				height: imageHeight,
				...( imagePlaceholder ? { placeholder: imagePlaceholder } : null )
			}
		} );
	}

	/**
	 * Inserts the link to the asset by calling the `link` command.
	 *
	 * @param asset The asset to be inserted.
	 * @param writer An instance of the model writer.
	 * @param isSingleAsset It's true when only one asset is processed.
	 */
	private _insertLink( asset: CKBoxAssetLinkDefinition, writer: ModelWriter, isSingleAsset: boolean ): void {
		const editor = this.editor;
		const model = editor.model;
		const selection = model.document.selection;
		const { linkName, linkHref } = asset.attributes;

		// If the selection is collapsed, insert the asset name as the link label and select it.
		if ( selection.isCollapsed ) {
			const selectionAttributes = toMap( selection.getAttributes() );
			const textNode = writer.createText( linkName, selectionAttributes );

			if ( !isSingleAsset ) {
				const selectionLastPosition = selection.getLastPosition()!;
				const parentElement = selectionLastPosition.parent;

				// Insert new `paragraph` when selection is not in an empty `paragraph`.
				if ( !( parentElement.name === 'paragraph' && parentElement.isEmpty ) ) {
					editor.execute( 'insertParagraph', {
						position: selectionLastPosition
					} );
				}

				const range = model.insertContent( textNode );

				writer.setSelection( range );
				editor.execute( 'link', linkHref );
				return;
			}

			const range = model.insertContent( textNode );

			writer.setSelection( range );
		}

		editor.execute( 'link', linkHref );
	}
}

/**
 * Parses the chosen assets into the internal data format. Filters out chosen assets that are not allowed.
 */
function prepareAssets(
	{ downloadableFilesConfig, assets, isImageAllowed, isLinkAllowed }: {
		downloadableFilesConfig: CKBoxConfig[ 'downloadableFiles' ];
		assets: Array<CKBoxRawAssetDefinition>;
		isImageAllowed: boolean;
		isLinkAllowed: boolean;
	}
): Array<CKBoxAssetDefinition> {
	return assets
		.map( asset => isImage( asset ) ?
			{
				id: asset.data.id,
				type: 'image',
				attributes: prepareImageAssetAttributes( asset )
			} as const :
			{
				id: asset.data.id,
				type: 'link',
				attributes: prepareLinkAssetAttributes( asset, downloadableFilesConfig )
			} as const
		)
		.filter( asset => asset.type === 'image' ? isImageAllowed : isLinkAllowed );
}

/**
 * Parses the assets attributes into the internal data format.
 *
 * @internal
 */
export function prepareImageAssetAttributes( asset: CKBoxRawAssetDefinition ): CKBoxAssetImageAttributesDefinition {
	const { imageFallbackUrl, imageSources } = getImageUrls( asset.data.imageUrls! );
	const { description, width, height, blurHash } = asset.data.metadata!;
	const imagePlaceholder = blurHashToDataUrl( blurHash );

	return {
		imageFallbackUrl,
		imageSources,
		imageTextAlternative: description || '',
		imageWidth: width,
		imageHeight: height,
		...( imagePlaceholder ? { imagePlaceholder } : null )
	};
}

/**
 * Parses the assets attributes into the internal data format.
 *
 * @param asset The asset to prepare the attributes for.
 * @param config The CKBox download asset configuration.
 */
function prepareLinkAssetAttributes(
	asset: CKBoxRawAssetDefinition,
	config: CKBoxConfig[ 'downloadableFiles' ]
): CKBoxAssetLinkAttributesDefinition {
	return {
		linkName: asset.data.name,
		linkHref: getAssetUrl( asset, config )
	};
}

/**
 * Checks whether the asset is an image.
 */
function isImage( asset: CKBoxRawAssetDefinition ) {
	const metadata = asset.data.metadata;

	if ( !metadata ) {
		return false;
	}

	return metadata.width && metadata.height;
}

/**
 * Creates the URL for the asset.
 *
 * @param asset The asset to create the URL for.
 * @param config The CKBox download asset configuration.
 */
function getAssetUrl( asset: CKBoxRawAssetDefinition, config: CKBoxConfig[ 'downloadableFiles' ] ) {
	const url = new URL( asset.data.url );

	if ( isDownloadableAsset( asset, config ) ) {
		url.searchParams.set( 'download', 'true' );
	}

	return url.toString();
}

/**
 * Determines if download should be enabled for given asset based on configuration.
 *
 * @param asset The asset to check.
 * @param config The CKBox download asset configuration.
 */
function isDownloadableAsset(
	asset: CKBoxRawAssetDefinition,
	config: CKBoxConfig[ 'downloadableFiles' ]
): boolean {
	if ( typeof config === 'function' ) {
		return config( asset );
	}

	return true;
}

/**
 * Fired when the command is executed, the dialog is closed or the assets are chosen.
 *
 * @eventName ~CKBoxCommand#ckbox
 */
type CKBoxEvent<Name extends '' | 'choose' | 'open' | 'close' = ''> = {
	name: Name extends '' ? 'ckbox' : `ckbox:${ Name }`;
	args: Name extends 'choose' ? [ assets: Array<CKBoxRawAssetDefinition> ] : [];
};
