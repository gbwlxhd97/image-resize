import React, { useEffect, useRef, useState } from 'react';
import * as UC from '@uploadcare/file-uploader';
import { OutputFileEntry } from '@uploadcare/file-uploader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import st from './RegularView.module.css';

// 해상도 설정 정의
const RESOLUTIONS = [
  { width: 200, height: 200, label: 'Thumbnail' },
  { width: 800, height: 600, label: 'Small' },
  { width: 1200, height: 900, label: 'Medium' },
  { width: 1920, height: 1080, label: 'Full HD' },
  { width: 3840, height: 2160, label: '4K' },
] as const;

type SelectedResolutions = {
  [key: string]: {
    [resolution: string]: boolean;
  };
};

UC.defineComponents(UC);

export default function RegularView() {
  const [files, setFiles] = useState<OutputFileEntry<'success'>[]>([]);
  const [selectedResolutions, setSelectedResolutions] =
    useState<SelectedResolutions>({});
  const ctxProviderRef = useRef<InstanceType<UC.UploadCtxProvider>>(null);

  useEffect(() => {
    const ctxProvider = ctxProviderRef.current;
    if (!ctxProvider) return;

    const handleChangeEvent = (e: UC.EventMap['change']) => {
      const newFiles = [
        ...e.detail.allEntries.filter((f) => f.status === 'success'),
      ] as OutputFileEntry<'success'>[];
      setFiles((prev) => [...prev, ...newFiles]);
    };

    ctxProvider.addEventListener('change', handleChangeEvent);
    return () => {
      ctxProvider.removeEventListener('change', handleChangeEvent);
    };
  }, []);

  const handleSelectAll = (fileUuid: string, isSelected: boolean) => {
    setSelectedResolutions((prev) => ({
      ...prev,
      [fileUuid]: RESOLUTIONS.reduce(
        (acc, resolution) => ({
          ...acc,
          [`${resolution.width}x${resolution.height}`]: isSelected,
        }),
        {}
      ),
    }));
  };

  const handleResolutionSelect = (
    fileUuid: string,
    resolution: string,
    isSelected: boolean
  ) => {
    setSelectedResolutions((prev) => ({
      ...prev,
      [fileUuid]: {
        ...(prev[fileUuid] || {}),
        [resolution]: isSelected,
      },
    }));
  };

  const handleDownloadZip = async (file: OutputFileEntry<'success'>) => {
    const zip = new JSZip();
    const selections = selectedResolutions[file.uuid] || {};

    const selectedItems = RESOLUTIONS.filter(
      (resolution) => selections[`${resolution.width}x${resolution.height}`]
    );

    for (const resolution of selectedItems) {
      const imageUrl = `${file.cdnUrl}/-/preview/-/resize/${resolution.width}x${resolution.height}/`;
      try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        zip.file(
          `${file.fileInfo.originalFilename}_${resolution.width}x${resolution.height}.jpg`,
          blob
        );
      } catch (error) {
        console.error(`Failed to download image: ${resolution.label}`, error);
      }
    }

    try {
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, `${file.fileInfo.originalFilename}_images.zip`);
    } catch (error) {
      console.error('Failed to generate zip file', error);
    }
  };

  return (
    <div>
      <uc-config
        ctx-name="my-uploader-3"
        pubkey="a6ca334c3520777c0045"
        sourceList="local, url, camera, dropbox"
        multiple={true}
        imgOnly={true}
      ></uc-config>
      <uc-file-uploader-regular
        ctx-name="my-uploader-3"
        class={st.uploader}
      ></uc-file-uploader-regular>
      <uc-upload-ctx-provider
        ctx-name="my-uploader-3"
        ref={ctxProviderRef}
      ></uc-upload-ctx-provider>

      <div className={st.previewsContainer}>
        {files.map((file) => (
          <div key={file.uuid} className={st.filePreview}>
            <h3 className={st.fileName}>{file.fileInfo.originalFilename}</h3>
            <p className={st.fileSize}>{formatSize(file.fileInfo.size)}</p>

            <div className={st.resolutionControls}>
              <label className={st.selectAllLabel}>
                <input
                  type="checkbox"
                  onChange={(e) => handleSelectAll(file.uuid, e.target.checked)}
                  checked={
                    Object.values(selectedResolutions[file.uuid] || {}).every(
                      Boolean
                    ) &&
                    Object.values(selectedResolutions[file.uuid] || {})
                      .length === RESOLUTIONS.length
                  }
                />
                전체 선택
              </label>
            </div>

            <div className={st.resolutionGrid}>
              {RESOLUTIONS.map((resolution) => (
                <div key={resolution.label} className={st.resolutionItem}>
                  <label className={st.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={
                        selectedResolutions[file.uuid]?.[
                          `${resolution.width}x${resolution.height}`
                        ] || false
                      }
                      onChange={(e) =>
                        handleResolutionSelect(
                          file.uuid,
                          `${resolution.width}x${resolution.height}`,
                          e.target.checked
                        )
                      }
                    />
                    {resolution.label} ({resolution.width}x{resolution.height})
                  </label>
                  <img
                    className={st.previewImage}
                    src={`${file.cdnUrl}/-/preview/-/resize/${resolution.width}x${resolution.height}/`}
                    alt={`${resolution.label} - ${file.fileInfo.originalFilename}`}
                  />
                </div>
              ))}
            </div>

            <button
              className={st.downloadZipButton}
              onClick={() => handleDownloadZip(file)}
              disabled={
                !Object.values(selectedResolutions[file.uuid] || {}).some(
                  Boolean
                )
              }
            >
              선택한 이미지 ZIP으로 다운로드
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatSize(bytes: number | null) {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}
