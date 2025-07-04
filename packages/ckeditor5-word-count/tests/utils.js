/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

import { modelElementToPlainText } from '../src/utils.js';

import { ModelElement } from '@ckeditor/ckeditor5-engine/src/model/element.js';
import { ModelText } from '@ckeditor/ckeditor5-engine/src/model/text.js';
import { VirtualTestEditor } from '@ckeditor/ckeditor5-core/tests/_utils/virtualtesteditor.js';
import { _setModelData } from '@ckeditor/ckeditor5-engine/src/dev-utils/model.js';
import { Paragraph } from '@ckeditor/ckeditor5-paragraph/src/paragraph.js';
import { BlockQuoteEditing } from '@ckeditor/ckeditor5-block-quote/src/blockquoteediting.js';
import { BoldEditing } from '@ckeditor/ckeditor5-basic-styles/src/bold/boldediting.js';
import { LinkEditing } from '@ckeditor/ckeditor5-link/src/linkediting.js';
import { LegacyListEditing } from '@ckeditor/ckeditor5-list/src/legacylist/legacylistediting.js';
import { TableEditing } from '@ckeditor/ckeditor5-table/src/tableediting.js';
import { Enter } from '@ckeditor/ckeditor5-enter/src/enter.js';
import { ShiftEnter } from '@ckeditor/ckeditor5-enter/src/shiftenter.js';

describe( 'utils', () => {
	describe( 'modelElementToPlainText()', () => {
		it( 'should extract only plain text', () => {
			const text1 = new ModelText( 'Foo' );
			const text2 = new ModelText( 'Bar', { bold: true } );
			const text3 = new ModelText( 'Baz', { bold: true, underline: true } );

			const innerElement1 = new ModelElement( 'paragraph', null, [ text1 ] );
			const innerElement2 = new ModelElement( 'paragraph', null, [ text2, text3 ] );

			const mainElement = new ModelElement( 'container', null, [ innerElement1, innerElement2 ] );

			expect( modelElementToPlainText( mainElement ) ).to.equal( 'Foo\nBarBaz' );
		} );

		describe( 'complex structures', () => {
			let editor, model;

			beforeEach( () => {
				return VirtualTestEditor
					.create( {
						plugins: [
							Enter, ShiftEnter, Paragraph, BoldEditing, LinkEditing, BlockQuoteEditing, LegacyListEditing, TableEditing
						]
					} )
					.then( newEditor => {
						editor = newEditor;
						model = editor.model;
					} );
			} );

			afterEach( async () => {
				await editor.destroy();
			} );

			it( 'extracts plain text from blockqoutes', () => {
				_setModelData( model, '<blockQuote>' +
						'<paragraph>Hello</paragraph>' +
						'<listItem listIndent="0" listType="numbered">world</listItem>' +
						'<listItem listIndent="0" listType="numbered">foo</listItem>' +
						'<paragraph>bar</paragraph>' +
					'</blockQuote>' );

				expect( modelElementToPlainText( model.document.getRoot() ) ).to.equal( 'Hello\nworld\nfoo\nbar' );
			} );

			it( 'extracts plain text from tables', () => {
				_setModelData( model, '<table>' +
						'<tableRow>' +
							'<tableCell>' +
								'<paragraph>Foo</paragraph>' +
							'</tableCell>' +
							'<tableCell>' +
								'<paragraph>Bar</paragraph>' +
							'</tableCell>' +
						'</tableRow>' +
						'<tableRow>' +
							'<tableCell>' +
								'<paragraph>Baz</paragraph>' +
							'</tableCell>' +
							'<tableCell>' +
								'<paragraph>Foo</paragraph>' +
							'</tableCell>' +
						'</tableRow>' +
					'</table>' );

				expect( modelElementToPlainText( model.document.getRoot() ) ).to.equal( 'Foo\nBar\nBaz\nFoo' );
			} );

			it( 'extracts plain text with soft break', () => {
				_setModelData( model, '<paragraph>Foo<softBreak></softBreak>bar</paragraph>' );

				expect( modelElementToPlainText( model.document.getRoot() ) ).to.equal( 'Foo\nbar' );
			} );

			it( 'extracts plain text with inline styles', () => {
				_setModelData( model, '<paragraph>F<$text bold="true">oo</$text><$text href="url">Ba</$text>r</paragraph>' );

				expect( modelElementToPlainText( model.document.getRoot() ) ).to.equal( 'FooBar' );
			} );

			it( 'extracts plain text from mixed structure', () => {
				_setModelData( model, '<paragraph>' +
						'<$text bold="true">111</$text><$text href="url" bold="true">222</$text>333' +
					'</paragraph><blockQuote>' +
						'<paragraph>444<softBreak></softBreak>555</paragraph>' +
						'<table>' +
							'<tableRow>' +
								'<tableCell><paragraph>666</paragraph></tableCell>' +
								'<tableCell><paragraph>7<$text bold="true">7</$text>7</paragraph></tableCell>' +
							'</tableRow>' +
							'<tableRow>' +
								'<tableCell><paragraph>888</paragraph></tableCell>' +
								'<tableCell><paragraph>999</paragraph></tableCell>' +
							'</tableRow>' +
						'</table>' +
					'</blockQuote><table>' +
						'<tableRow>' +
							'<tableCell><paragraph>000</paragraph></tableCell>' +
							'<tableCell><blockQuote>' +
								'<listItem listIndent="0" listType="numbered">111</listItem>' +
								'<listItem listIndent="0" listType="numbered">222</listItem>' +
							'</blockQuote></tableCell>' +
						'</tableRow>' +
					'</table>' );

				expect( modelElementToPlainText( model.document.getRoot() ) ).to.equal(
					'111222333\n444\n555\n666\n777\n888\n999\n000\n111\n222'
				);
			} );
		} );
	} );
} );
