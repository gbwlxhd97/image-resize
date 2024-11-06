import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as UC from '@uploadcare/file-uploader';
import { OutputFileEntry } from '@uploadcare/file-uploader';
import st from './FileUploader.module.scss';
import cs from 'classnames';

UC.defineComponents(UC);

type FileUploaderProps = {
  uploaderClassName: string;
  uploaderCtxName: string;
  files: OutputFileEntry[];
  onChange: (files: OutputFileEntry[]) => void;
  theme: 'light' | 'dark';
};

export default function FileUploader({
  files,
  uploaderClassName,
  uploaderCtxName,
  onChange,
  theme,
}: FileUploaderProps) {
  const [uploadedFiles, setUploadedFiles] = useState<
    OutputFileEntry<'success'>[]
  >([]);
  const ctxProviderRef = useRef<InstanceType<UC.UploadCtxProvider>>(null);
  const configRef = useRef<InstanceType<UC.Config>>(null);

  const handleRemoveClick = useCallback(
    (uuid: OutputFileEntry['uuid']) =>
      onChange(files.filter((f) => f.uuid !== uuid)),
    [files, onChange]
  );

  useEffect(() => {
    const ctxProvider = ctxProviderRef.current;
    if (!ctxProvider) return;

    const handleChangeEvent = (e: UC.EventMap['change']) => {
      setUploadedFiles([
        ...e.detail.allEntries.filter((f) => f.status === 'success'),
      ] as OutputFileEntry<'success'>[]);
    };

    ctxProvider.addEventListener('change', handleChangeEvent);
    return () => {
      ctxProvider.removeEventListener('change', handleChangeEvent);
    };
  }, [setUploadedFiles]);

  useEffect(() => {
    const config = configRef.current;
    if (!config) return;

    config.localeDefinitionOverride = {
      en: {
        photo__one: 'photo',
        photo__many: 'photos',
        photo__other: 'photos',
        'upload-file': 'Upload photo',
        'upload-files': 'Upload photos',
        'choose-file': 'Choose photo',
        'choose-files': 'Choose photos',
        'drop-files-here': 'Drop photos here',
        'select-file-source': 'Select photo source',
        'edit-image': 'Edit photo',
        'no-files': 'No photos selected',
        'caption-edit-file': 'Edit photo',
        'files-count-allowed': 'Only {{count}} {{plural:photo(count)}} allowed',
        'files-max-size-limit-error':
          'Photo is too big. Max photo size is {{maxFileSize}}.',
        'header-uploading': 'Uploading {{count}} {{plural:photo(count)}}',
        'header-succeed': '{{count}} {{plural:photo(count)}} uploaded',
        'header-total': '{{count}} {{plural:photo(count)}} selected',
      },
    };

    return () => {
      config.localeDefinitionOverride = null;
    };
  }, [setUploadedFiles]);

  useEffect(() => {
    const ctxProvider = ctxProviderRef.current;
    if (!ctxProvider) return;

    const resetUploaderState = () => {
      const api = ctxProviderRef.current?.getAPI();
      if (!api) return;
      api.removeAllFiles();
    };

    const handleModalCloseEvent = () => {
      resetUploaderState();
      onChange([...files, ...uploadedFiles]);
      setUploadedFiles([]);
    };

    ctxProvider.addEventListener('modal-close', handleModalCloseEvent);
    return () => {
      ctxProvider.removeEventListener('modal-close', handleModalCloseEvent);
    };
  }, [files, onChange, uploadedFiles, setUploadedFiles]);

  return (
    <div className={st.root}>
      <uc-config
        ref={configRef}
        ctx-name={uploaderCtxName}
        pubkey="a6ca334c3520777c0045"
        multiple={true}
        sourceList="local, url, camera, dropbox, gdrive"
        confirmUpload={false}
        removeCopyright={true}
        imgOnly={true}
      ></uc-config>

      <uc-file-uploader-regular
        ctx-name={uploaderCtxName}
        class={cs(uploaderClassName, {
          'uc-dark': theme === 'dark',
          'uc-light': theme === 'light',
        })}
      ></uc-file-uploader-regular>

      <uc-upload-ctx-provider ref={ctxProviderRef} ctx-name={uploaderCtxName} />

      <div className={st.previews}>
        {files.map((file) => (
          <div key={file.uuid} className={st.preview}>
            <img
              className={st.previewImage}
              key={file.uuid}
              src={`${file.cdnUrl}/-/preview/-/resize/x200/`}
              width="100"
              alt={file.fileInfo?.originalFilename || ''}
              title={file.fileInfo?.originalFilename || ''}
            />
            <button
              className={st.previewRemoveButton}
              type="button"
              onClick={() => handleRemoveClick(file.uuid)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
