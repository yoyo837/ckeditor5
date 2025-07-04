/**
 * @license Copyright (c) 2003-2025, CKSource Holding sp. z o.o. All rights reserved.
 * For licensing, see LICENSE.md or https://ckeditor.com/legal/ckeditor-licensing-options
 */

/**
 * @module upload
 */

export {
	FileRepository,
	type UploadAdapter,
	type UploadResponse,
	type FileLoader
} from './filerepository.js';
export { Base64UploadAdapter } from './adapters/base64uploadadapter.js';
export { SimpleUploadAdapter } from './adapters/simpleuploadadapter.js';
export type { SimpleUploadConfig } from './uploadconfig.js';
export { FileReader } from './filereader.js';

import './augmentation.js';
