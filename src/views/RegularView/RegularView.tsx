import React, { useEffect, useRef, useState } from 'react';
import * as UC from '@uploadcare/file-uploader';
import { OutputFileEntry } from '@uploadcare/file-uploader';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import st from './RegularView.module.css';

// 해상도 설정 정의
const RESOLUTIONS = [
  { width: 2000, height: 570, label: '메인 배너' },
  { width: 1098, height: 318, label: '서브 배너' },
  { width: 720, height: 720, label: '정사각형' },
  { width: 549, height: 261, label: '중형 배너' },
  { width: 366, height: 204, label: '소형 배너 가로' },
  { width: 366, height: 522, label: '소형 배너 세로' },
  { width: 366, height: 261, label: '소형 배너 중간' },
  { width: 260, height: 145, label: '썸네일' },
] as const;

type SelectedResolutions = {
  [key: string]: {
    [resolution: string]: boolean;
  };
};

const getAspectRatioClass = (label: string) => {
  switch (label) {
    case '메인 배너':
      return st.mainBanner;
    case '서브 배너':
      return st.subBanner;
    case '정사각형':
      return st.square;
    case '중형 배너':
      return st.mediumBanner;
    case '소형 배너 가로':
      return st.smallBannerH;
    case '소형 배너 세로':
      return st.smallBannerV;
    case '소형 배너 중간':
      return st.smallBannerM;
    case '썸네일':
      return st.thumbnail;
    default:
      return '';
  }
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

  const handleDownloadCSV = (file: OutputFileEntry<'success'>) => {
    const selectedItems = RESOLUTIONS.filter(resolution => 
      selectedResolutions[file.uuid]?.[`${resolution.width}x${resolution.height}`]
    );

    const csvContent = [
      ['Label', 'Width', 'Height', 'URL'].join(','),
      ...selectedItems.map(resolution => [
        resolution.label,
        resolution.width,
        resolution.height,
        `${file.cdnUrl}/-/preview/-/resize/${resolution.width}x${resolution.height}/`
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${file.fileInfo.originalFilename}_resized_urls.csv`);
  };

  return (
    <div className="container">
      <h1 className="title">Image Resizer</h1>
      <p className="subtitle">- By juyeon</p>
      <div className="logo">
        <img src="/src/assets/main_img.jpg" alt="Image Resizer Logo" />
      </div>
      
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
                    <div
                      className={`${st.imageWrapper} ${getAspectRatioClass(
                        resolution.label
                      )}`}
                    >
                      <img
                        className={st.previewImage}
                        src={`${file.cdnUrl}/-/preview/-/resize/${resolution.width}x${resolution.height}/`}
                        alt={`${resolution.label} - ${file.fileInfo.originalFilename}`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className={st.buttonGroup}>
                <button
                  className={st.downloadZipButton}
                  onClick={() => handleDownloadZip(file)}
                  disabled={!Object.values(selectedResolutions[file.uuid] || {}).some(Boolean)}
                >
                  선택한 이미지 ZIP으로 다운로드
                </button>
                <button
                  className={st.downloadCSVButton}
                  onClick={() => handleDownloadCSV(file)}
                  disabled={!Object.values(selectedResolutions[file.uuid] || {}).some(Boolean)}
                >
                  선택한 이미지 URL CSV로 다운로드
                </button>
              </div>
            </div>
          ))}
        </div>
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
