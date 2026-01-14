import { useCallback } from 'react';
import { useAppStore } from '../../stores/appStore';
import type { PlzQueryOutput } from '../../types/plz';

export function FileUpload() {
  const loadData = useAppStore((state) => state.loadData);
  const setError = useAppStore((state) => state.setError);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const data: PlzQueryOutput = JSON.parse(text);
        loadData(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to parse JSON file');
      }
    },
    [loadData, setError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-indigo-400 transition-colors cursor-pointer"
    >
      <input
        type="file"
        accept=".json"
        onChange={handleChange}
        className="hidden"
        id="file-upload"
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="text-slate-600">
          <p className="font-medium">Drop a JSON file here</p>
          <p className="text-sm text-slate-400 mt-1">or click to browse</p>
        </div>
      </label>
    </div>
  );
}
