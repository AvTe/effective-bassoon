"use client";

import { useState, useEffect, useRef } from "react";
import JSZip from "jszip";
import Compressor from "compressorjs";
import UPNG from "upng-js";
import { Image as ImageIcon, Download, Settings, Loader2, CheckCircle2, AlertCircle, RefreshCw, Plus, Trash2, UploadCloud, X } from "lucide-react";
import styles from "./page.module.css";

function bytesToSize(bytes) {
  if (bytes === 0) return '0 B';
  const isNegative = bytes < 0;
  const absBytes = Math.abs(bytes);
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(absBytes) / Math.log(k));
  const value = parseFloat((absBytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  return isNegative ? '-' + value : value;
}

export default function Home() {
  const [pendingImages, setPendingImages] = useState([]);
  const [folderName, setFolderName] = useState("compressed_images");
  
  // Settings matching compressimage.io
  const [quality, setQuality] = useState(70);
  const [maxSize, setMaxSize] = useState("4000");
  const [suffix, setSuffix] = useState("");
  const [convertToWebp, setConvertToWebp] = useState(false);
  const [showSettings, setShowSettings] = useState(true);
  
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState([]);
  const [globalError, setGlobalError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [driveLink, setDriveLink] = useState("");
  const [isFetchingDrive, setIsFetchingDrive] = useState(false);
  const [lightboxImg, setLightboxImg] = useState(null);

  const fileInputRef = useRef(null);

  useEffect(() => {
    // Attempt to scrape page on load
    if (typeof chrome !== "undefined" && chrome.tabs && typeof window !== "undefined") {
      const urlParams = new URLSearchParams(window.location.search);
      const tabIdParam = urlParams.get('tabId');
      
      if (tabIdParam) {
        // We have a specific tabId passed from the background script
        const targetTabId = parseInt(tabIdParam, 10);
        chrome.tabs.sendMessage(
          targetTabId,
          { action: "GET_IMAGES" },
          (response) => {
            if (!chrome.runtime.lastError && response && response.images && response.images.length > 0) {
              const scraped = response.images.map(img => ({
                id: Math.random().toString(),
                file: null,
                scrapedUrl: img.url,
                filename: img.filename,
                previewUrl: img.thumbnailUrl || img.url,
                originalSize: null,
                isSelected: true
              }));
              setPendingImages(prev => [...prev, ...scraped]);
              if (response.title) setFolderName(response.title);
            }
          }
        );
      } else {
        // Fallback in case it's opened in a way where tabId is missing
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].id) {
            chrome.tabs.sendMessage(
              tabs[0].id,
              { action: "GET_IMAGES" },
              (response) => {
                if (!chrome.runtime.lastError && response && response.images && response.images.length > 0) {
                  const scraped = response.images.map(img => ({
                    id: Math.random().toString(),
                    file: null,
                    scrapedUrl: img.url,
                    filename: img.filename,
                    previewUrl: img.thumbnailUrl || img.url,
                    originalSize: null,
                    isSelected: true
                  }));
                  setPendingImages(prev => [...prev, ...scraped]);
                  if (response.title) setFolderName(response.title);
                }
              }
            );
          }
        });
      }
    }
  }, []);

  const handleAddFiles = (files) => {
    const newPending = Array.from(files)
      .filter(f => f.type && f.type.startsWith('image/'))
      .map(f => ({
        id: Math.random().toString(),
        file: f,
        scrapedUrl: null,
        filename: f.name,
        previewUrl: URL.createObjectURL(f),
        originalSize: f.size,
        isSelected: true
      }));
    setPendingImages(prev => [...prev, ...newPending]);
  };

  const processFileEntry = (entry, files) => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file) => {
          if (file.type && file.type.startsWith('image/')) {
            files.push(file);
          }
          resolve();
        });
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        dirReader.readEntries(async (entries) => {
          for (let i = 0; i < entries.length; i++) {
            await processFileEntry(entries[i], files);
          }
          resolve();
        });
      } else {
        resolve();
      }
    });
  };

  const onDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.items) {
      const files = [];
      const promises = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i];
        if (item.kind === 'file') {
          const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
          if (entry) {
            promises.push(processFileEntry(entry, files));
          } else {
            const file = item.getAsFile();
            if (file && file.type.startsWith('image/')) files.push(file);
          }
        }
      }
      await Promise.all(promises);
      if (files.length > 0) handleAddFiles(files);
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  
  const onDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const toggleSelection = (id) => {
    setPendingImages(prev => prev.map(img => 
      img.id === id ? { ...img, isSelected: !img.isSelected } : img
    ));
  };

  const removePending = (id) => {
    setPendingImages(prev => prev.filter(img => img.id !== id));
  };

  const clearAll = () => {
    setPendingImages([]);
    setResults([]);
  };

  const triggerDownload = (blob, filename) => {
    const downloadUrl = URL.createObjectURL(blob);
    if (typeof chrome !== "undefined" && chrome.downloads) {
      chrome.downloads.download({
        url: downloadUrl,
        filename: filename,
        saveAs: false
      }, () => {
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
      });
    } else {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
    }
  };

  const handleFetchDriveFolder = async () => {
    if (!driveLink || !driveLink.includes("drive.google.com")) {
      setGlobalError("Please enter a valid Google Drive link.");
      return;
    }
    
    setGlobalError("");
    setIsFetchingDrive(true);
    
    try {
      if (typeof chrome !== "undefined" && chrome.tabs) {
        chrome.tabs.create({ url: driveLink, active: false }, (newTab) => {
          // Wait for the new tab to load dynamically
          setTimeout(() => {
            chrome.scripting.executeScript({
              target: { tabId: newTab.id },
              files: ["content.js"]
            }, () => {
              chrome.tabs.sendMessage(newTab.id, { action: "GET_IMAGES" }, (response) => {
                if (!chrome.runtime.lastError && response && response.images && response.images.length > 0) {
                  const scraped = response.images.map(img => ({
                    id: Math.random().toString(),
                    file: null,
                    scrapedUrl: img.url,
                    filename: img.filename,
                    previewUrl: img.thumbnailUrl || img.url,
                    originalSize: null,
                    isSelected: true
                  }));
                  setPendingImages(prev => {
                    const existingUrls = new Set(prev.map(p => p.scrapedUrl || p.filename));
                    const fresh = scraped.filter(s => !existingUrls.has(s.scrapedUrl));
                    return [...prev, ...fresh];
                  });
                  if (response.title) setFolderName(response.title);
                } else {
                  setGlobalError("No images found or could not access folder contents.");
                }
                chrome.tabs.remove(newTab.id);
                setIsFetchingDrive(false);
                setDriveLink("");
              });
            });
          }, 4500); // 4.5 seconds for React to mount and load DOM
        });
      }
    } catch (e) {
      setGlobalError("Failed to fetch from Drive folder link.");
      setIsFetchingDrive(false);
    }
  };

  const fetchImageAsBlob = async (url) => {
    try {
      const response = await fetch(url);
      return await response.blob();
    } catch (e) {
      console.error("Failed to fetch image:", url, e);
      return null;
    }
  };

  const processImage = (blob, originalExt) => {
    return new Promise((resolve, reject) => {
      let mimeType = 'auto';
      let finalExt = originalExt;
      
      if (convertToWebp) {
        mimeType = 'image/webp';
        finalExt = 'webp';
      }

      const isNativePng = originalExt.toLowerCase() === 'png' && !convertToWebp;

      new Compressor(blob, {
        quality: quality / 100,
        maxWidth: parseInt(maxSize) || Infinity,
        maxHeight: parseInt(maxSize) || Infinity,
        mimeType: mimeType,
        success(result) {
          if (isNativePng) {
            const url = URL.createObjectURL(result);
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext("2d");
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              
              try {
                const colors = quality === 100 ? 0 : Math.max(2, Math.floor(256 * (quality / 100)));
                const pngBuffer = UPNG.encode([imgData.data.buffer], canvas.width, canvas.height, colors);
                const finalBlob = new Blob([pngBuffer], { type: "image/png" });
                resolve({ blob: finalBlob, ext: finalExt });
              } catch (e) {
                reject(e);
              } finally {
                URL.revokeObjectURL(url);
              }
            };
            img.onerror = () => {
              reject(new Error("Failed to process PNG"));
              URL.revokeObjectURL(url);
            };
            img.src = url;
          } else {
             resolve({ blob: result, ext: finalExt });
          }
        },
        error(err) {
          reject(err);
        },
      });
    });
  };

  const handleCompressAndDownload = async () => {
    const imagesToProcess = pendingImages.filter(img => img.isSelected);
    if (imagesToProcess.length === 0) return;
    
    setIsCompressing(true);
    setResults([]);
    setProgress(0);
    setGlobalError("");
    
    const zip = new JSZip();
    let successCount = 0;
    const newResults = [];

    for (let i = 0; i < imagesToProcess.length; i++) {
      const imgInfo = imagesToProcess[i];
      
      let blob = imgInfo.file;
      if (!blob && imgInfo.scrapedUrl) {
        blob = await fetchImageAsBlob(imgInfo.scrapedUrl);
      }
      
      if (!blob) {
        setProgress(((i + 1) / pendingImages.length) * 100);
        continue;
      }

      try {
        const originalExt = imgInfo.filename.split('.').pop() || 'jpg';
        const { blob: compressedBlob, ext: finalExt } = await processImage(blob, originalExt);
        
        let baseName = imgInfo.filename.replace(/\.[^/.]+$/, "");
        if (suffix) baseName += suffix;
        const safeName = `${baseName}.${finalExt}`;
        
        zip.file(safeName, compressedBlob);
        successCount++;
        
        newResults.push({
          url: imgInfo.previewUrl,
          previewUrl: imgInfo.file ? imgInfo.previewUrl : URL.createObjectURL(blob),
          filename: safeName,
          originalSize: blob.size,
          newSize: compressedBlob.size,
          blob: compressedBlob
        });
        setResults([...newResults]);
      } catch (err) {
        console.error("Compression error for image", i, err);
      }
      
      setProgress(((i + 1) / imagesToProcess.length) * 100);
    }

    if (successCount === 0) {
      setGlobalError("Failed to compress any images.");
      setIsCompressing(false);
      return;
    }

    if (newResults.length === 1) {
      triggerDownload(newResults[0].blob, newResults[0].filename);
      setIsCompressing(false);
    } else {
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const downloadUrl = URL.createObjectURL(zipBlob);
      
      if (typeof chrome !== "undefined" && chrome.downloads) {
        chrome.downloads.download({
          url: downloadUrl,
          filename: `${folderName}.zip`,
          saveAs: true
        }, () => {
          setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
          setIsCompressing(false);
        });
      } else {
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `${folderName}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 5000);
        setIsCompressing(false);
      }
    }
  };

  const totalOriginal = results.reduce((acc, curr) => acc + curr.originalSize, 0);
  const totalNew = results.reduce((acc, curr) => acc + curr.newSize, 0);
  const totalReduced = totalOriginal - totalNew;
  const isTotalReduced = totalReduced > 0;
  const reductionPercent = totalOriginal > 0 ? Math.round((Math.abs(totalReduced) / totalOriginal) * 100) : 0;

  return (
    <div 
      className={`${styles.container} ${isDragging ? styles.dropzoneActive : ''}`} 
      onDrop={onDrop} 
      onDragOver={onDragOver}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={onDragLeave}
    >
      {isDragging && (
        <div className={styles.dragOverlay}>
          <UploadCloud size={48} color="#7c3aed" />
          <h2>Drop Images Here</h2>
        </div>
      )}
      <input 
        type="file" 
        multiple 
        accept="image/*" 
        ref={fileInputRef} 
        style={{display: 'none'}} 
        onChange={(e) => handleAddFiles(e.target.files)} 
      />

      <div className={styles.header}>
        <div className={styles.titleRow}>
          <ImageIcon size={24} strokeWidth={1.5} color="#7c3aed" />
          <h1 className={styles.title}>CleanCompress</h1>
        </div>
      </div>

      <div className={styles.actionBar}>
        <button className={styles.actionBtn} onClick={() => fileInputRef.current.click()}>
          <Plus size={16} strokeWidth={1.75} /> Add Files
        </button>
        <button className={styles.actionBtn} onClick={clearAll} disabled={pendingImages.length === 0 && results.length === 0}>
          <Trash2 size={16} strokeWidth={1.75} /> Clear All
        </button>
        <div style={{flex: 1}} />
        <button className={`${styles.actionBtn} ${showSettings ? styles.activeSettings : ''}`} onClick={() => setShowSettings(!showSettings)}>
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>

      {!isCompressing && results.length === 0 && (
        <div className={styles.driveImportBox}>
          <input 
            type="text" 
            placeholder="Paste Google Drive Folder Link..." 
            value={driveLink}
            onChange={(e) => setDriveLink(e.target.value)}
            className={styles.inputField}
            style={{flex: 1, marginBottom: 0, padding: '8px'}}
          />
          <button 
            className={styles.primaryButton} 
            style={{ width: 'auto', padding: '8px 16px', margin: 0, height: '36px', fontSize: '12px' }}
            onClick={handleFetchDriveFolder}
            disabled={isFetchingDrive || !driveLink}
          >
            {isFetchingDrive ? <Loader2 size={14} className="animate-spin" /> : 'Fetch Files'}
          </button>
        </div>
      )}

      {showSettings && !isCompressing && results.length === 0 && (
        <div className={styles.settingsPanel}>
          <div className={styles.settingRow}>
            <div className={styles.settingHeader}>
              <span className={styles.settingLabel}>Image Quality</span>
              <span className={styles.settingValue}>{quality}%</span>
            </div>
            <input 
              type="range" 
              min="1" max="100" 
              value={quality} 
              onChange={(e) => setQuality(parseInt(e.target.value))}
              className={styles.slider} 
            />
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>Max Width or Height (PX)</span>
            <input 
              type="number" 
              value={maxSize} 
              onChange={(e) => setMaxSize(e.target.value)}
              className={styles.inputField}
              placeholder="e.g. 4000"
            />
          </div>

          <div className={styles.settingRow}>
            <span className={styles.settingLabel}>File Suffix</span>
            <input 
              type="text" 
              value={suffix} 
              onChange={(e) => setSuffix(e.target.value)}
              className={styles.inputField}
              placeholder="eg: -compressed, -tiny"
            />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.toggleRow}>
               <span className={styles.settingLabel}>Convert to WEBP</span>
               <label className={styles.toggleSwitch}>
                 <input 
                   type="checkbox" 
                   checked={convertToWebp} 
                   onChange={(e) => setConvertToWebp(e.target.checked)} 
                 />
                 <span className={styles.sliderToggle}></span>
               </label>
            </div>
          </div>
        </div>
      )}

      {pendingImages.length === 0 && results.length === 0 && !isCompressing && (
        <div className={styles.dropzone} onClick={() => fileInputRef.current.click()}>
          <UploadCloud size={48} color="#d1d5db" />
          <p>Drag & Drop images here or click to select files</p>
        </div>
      )}

      {!isCompressing && results.length === 0 && pendingImages.length > 0 && (
        <div className={styles.pendingArea}>
          {pendingImages.map((img) => (
              <div key={img.id} className={styles.resultItem} style={{ opacity: img.isSelected ? 1 : 0.5 }}>
                <input 
                  type="checkbox" 
                  checked={img.isSelected} 
                  onChange={() => toggleSelection(img.id)}
                  style={{ marginRight: '8px', cursor: 'pointer' }}
                />
                <img 
                  src={img.previewUrl} 
                  alt="" 
                  className={styles.thumbnail} 
                  style={{ cursor: 'pointer' }}
                  onClick={() => setLightboxImg(img.previewUrl)}
                />
                <div className={styles.resultInfo}>
                  <div className={styles.filename}>{img.filename}</div>
                  <div className={styles.sizes}>
                    {img.originalSize ? bytesToSize(img.originalSize) : "Size Unknown (Web Image)"}
                  </div>
                </div>
                <button className={styles.removeBtn} onClick={() => removePending(img.id)}>
                  <X size={16} />
                </button>
              </div>
            ))}
          </div>
        )}

        {!isCompressing && results.length === 0 && pendingImages.length > 0 && (
          <div style={{padding: '16px'}}>
            <button
              className={styles.primaryButton}
              onClick={handleCompressAndDownload}
              disabled={!pendingImages.some(img => img.isSelected)}
            >
              Compress {pendingImages.filter(img => img.isSelected).length} Images
            </button>
          </div>
        )}

      {globalError && <div className={styles.summaryBannerError}><AlertCircle size={16}/> {globalError}</div>}

      {(isCompressing || results.length > 0) && (
        <>
          {isCompressing ? (
            <div className={styles.summaryBanner}>
              <Loader2 size={16} className="animate-spin" />
              Compressing... {Math.round(progress)}%
            </div>
          ) : (
            <div className={styles.summaryBanner}>
              <CheckCircle2 size={16} />
              Compressed {results.length}/{pendingImages.length} Images. {isTotalReduced ? 'Reduced' : 'Increased'} {bytesToSize(totalReduced)} ({isTotalReduced ? '' : '+'}{reductionPercent}%)
            </div>
          )}

          <div className={styles.resultsArea}>
            {results.map((res, i) => {
              const diff = res.originalSize - res.newSize;
              const pct = res.originalSize > 0 ? Math.round((diff / res.originalSize) * 100) : 0;
              const isReduced = diff >= 0;
              return (
                <div key={i} className={styles.resultItem}>
                  <CheckCircle2 size={18} className={styles.resultIcon} />
                  <img 
                    src={res.previewUrl || res.url} 
                    alt="" 
                    className={styles.thumbnail} 
                    style={{ cursor: 'pointer' }}
                    onClick={() => setLightboxImg(res.previewUrl || res.url)}
                  />
                  <div className={styles.resultInfo}>
                    <div className={styles.filename}>{res.filename}</div>
                    <div className={styles.sizes}>
                      {bytesToSize(res.originalSize)} &rarr; <span style={{color: isReduced ? '#10b981' : '#ef4444'}}>{bytesToSize(res.newSize)}</span>
                    </div>
                  </div>
                  <div className={`${styles.reduction} ${isReduced ? styles.reductionGood : styles.reductionBad}`} style={{ marginRight: '8px' }}>
                    {isReduced ? `-${pct}%` : `+${Math.abs(pct)}%`}
                  </div>
                  <button 
                    className={styles.downloadIconBtn} 
                    onClick={() => triggerDownload(res.blob, res.filename)} 
                    title="Download individual image"
                  >
                    <Download size={16} />
                  </button>
                </div>
              );
            })}
          </div>

          {!isCompressing && results.length > 0 && (
            <div className={styles.footer}>
              <div className={styles.totalSizes}>
                {bytesToSize(totalOriginal)} &rarr; <strong>{bytesToSize(totalNew)}</strong>
              </div>
              <div className={styles.totalReduction}>
                Total {isTotalReduced ? 'Reduced' : 'Increased'} <span style={{color: isTotalReduced ? '#10b981' : '#ef4444'}}>{bytesToSize(totalReduced)} ({isTotalReduced ? '' : '+'}{reductionPercent}%)</span>
              </div>
              <button 
                className={styles.button} 
                style={{width: 'auto', marginTop: 0, marginLeft: '12px'}} 
                onClick={() => { setResults([]); setPendingImages([]); }}
              >
                <RefreshCw size={14} /> Finish
              </button>
            </div>
          )}
        </>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}} />

      {lightboxImg && (
        <div className={styles.lightbox} onClick={() => setLightboxImg(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxImg(null)}>
            <X size={24} color="white" strokeWidth={1.5} />
          </button>
          <img src={lightboxImg} alt="Preview" className={styles.lightboxImage} />
        </div>
      )}

      <div className={styles.creditFooter}>
        Developed by <a href="https://github.com/Avte/" target="_blank" rel="noopener noreferrer">Amit</a>
      </div>
    </div>
  );
}
