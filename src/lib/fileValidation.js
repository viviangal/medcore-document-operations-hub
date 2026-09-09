import {
  ACCEPTED_EXTENSIONS,
  ACCEPTED_MIME_TYPES,
  MAX_FILE_BYTES,
  MAX_FILE_MB
} from './constants.js'
import { createAppError } from './errors.js'
import { fileExtension } from './format.js'

// Some browsers report an empty or generic MIME type (notably for DOCX), so the
// extension is accepted as a fallback. Both checks run before anything is sent.
export function validateFile(file) {
  if (!file) {
    return createAppError('UNSUPPORTED_FILE_TYPE', {
      title: 'No file selected',
      message: 'Choose a PDF, DOCX or TXT file to continue.'
    })
  }

  const extension = fileExtension(file.name)
  const mimeAllowed = ACCEPTED_MIME_TYPES.includes(file.type)
  const extensionAllowed = ACCEPTED_EXTENSIONS.includes(extension)

  if (!mimeAllowed && !extensionAllowed) {
    return createAppError('UNSUPPORTED_FILE_TYPE')
  }

  if (file.size === 0) {
    return createAppError('EMPTY_DOCUMENT', {
      title: 'The file is empty',
      message: 'This file contains no content. Choose a different file.'
    })
  }

  if (file.size > MAX_FILE_BYTES) {
    return createAppError('FILE_TOO_LARGE', {
      message: `The selected file is larger than the ${MAX_FILE_MB} MB limit. Choose a smaller file.`
    })
  }

  return null
}

// CONTRACT.md section 1: file_base64 must not include the data URL prefix.
export function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () =>
      reject(
        createAppError('EMPTY_DOCUMENT', {
          title: 'The file could not be read',
          message: 'This file could not be opened by the browser. Choose a different file.'
        })
      )
    reader.onload = () => {
      const result = String(reader.result ?? '')
      const separator = result.indexOf(',')
      resolve(separator === -1 ? result : result.slice(separator + 1))
    }
    reader.readAsDataURL(file)
  })
}

// The MIME type the contract expects, even when the browser reports nothing.
export function resolveMimeType(file) {
  if (ACCEPTED_MIME_TYPES.includes(file.type)) return file.type
  switch (fileExtension(file.name)) {
    case '.pdf':
      return 'application/pdf'
    case '.docx':
      return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    case '.txt':
      return 'text/plain'
    default:
      return file.type || 'application/octet-stream'
  }
}
